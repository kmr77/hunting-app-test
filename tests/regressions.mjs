// Run only against a restored disposable DB: REGRESSION_DATABASE_URL=... node tests/regressions.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const loadModule = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const url = new URL(process.env.REGRESSION_DATABASE_URL || 'http://invalid');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^\/hunting_app_fix_\d+$/.test(url.pathname)) {
  throw Error('A restored disposable hunting_app_fix_* database is required');
}
process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = 'production';
const ts = loadModule('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'next/cache') return { revalidatePath() {} };
  if (request === 'next/navigation') return { redirect(location) { throw Object.assign(new Error('Redirect'), { location }); } };
  return load.call(this, request, ...rest);
};
loadModule.extensions['.ts'] = function (mod, file) {
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, file);
};
const actions = loadModule('../src/app/actions.ts');
const data = loadModule('../src/lib/app-data.ts');
const { prisma } = loadModule('../src/lib/prisma.ts');
const results = [];
const logs = [];
const originalError = console.error;
console.error = (label, error) => logs.push({ label, type: error?.name, code: error?.code });
const tag = 'regression_' + Date.now();
function form(values) {
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach(item => f.append(key, String(item)));
    else f.set(key, String(value));
  }
  return f;
}
async function call(name, values, state = false) {
  try { return state ? await actions[name](null, form(values)) : await actions[name](form(values)); }
  catch (error) {
    if (!error.location) throw error;
    const location = new URL(error.location, 'http://local.invalid');
    return { success: location.searchParams.get('status') === 'success', message: location.searchParams.get('message') };
  }
}
function check(name, condition) { assert.ok(condition, name); results.push({ name, passed: true }); }
async function main() {
  const [{ db }] = await prisma.$queryRawUnsafe('SELECT current_database() AS db');
  check('isolated_database_guard', '/' + db === url.pathname);
  const user = await data.getCurrentUser();
  const account = { email: user.email, lastName: 'Regression', firstName: 'Fixture', birthDate: '19800909' };
  for (const [key, value] of [['planCode', 'ADMIN'], ['planCode', 'PAID'], ['status', 'SUSPENDED'], ['role', 'ADMIN']]) {
    const before = await prisma.user.findUnique({ where: { id: user.id } });
    const result = await call('updateAccountAction', { ...account, [key]: value });
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    check('account_reject_' + key + '_' + value, !result.success && after.planCode === before.planCode && after.status === before.status && after.email === before.email);
  }
  check('account_normal_update', (await call('updateAccountAction', account)).success);
  const countBeforeEmail = await prisma.user.count();
  check('account_email_update', (await call('updateAccountAction', { ...account, email: tag + '@example.invalid' })).success);
  check('demo_identity_survives_email_change', (await data.getCurrentUser()).id === user.id && await prisma.user.count() === countBeforeEmail);
  const foreign = await prisma.user.create({ data: { email: tag + '_foreign@example.invalid', passwordHash: 'synthetic-not-a-login' } });
  check('duplicate_email_rejected', !(await call('updateAccountAction', { ...account, email: foreign.email })).success);
  check('duplicate_email_preserves_identity', (await data.getCurrentUser()).id === user.id);
  const emailBeforeFailure = (await data.getCurrentUser()).email;
  await prisma.$executeRawUnsafe("CREATE FUNCTION regression_reject_profile() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$");
  await prisma.$executeRawUnsafe('CREATE TRIGGER regression_reject_profile BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION regression_reject_profile()');
  try {
    check('account_profile_failure', !(await call('updateAccountAction', { ...account, email: tag + '_rollback@example.invalid' })).success);
    check('account_profile_failure_rolls_back_email', (await data.getCurrentUser()).email === emailBeforeFailure);
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER regression_reject_profile ON user_profiles');
    await prisma.$executeRawUnsafe('DROP FUNCTION regression_reject_profile()');
  }

  const ammo = { transactionDate: '20250925', recordType: 'PURCHASE', ammoCategory: 'SHOT_SHELL', quantity: '100', caliber: '12', shotSize: '7.5', manufacturer: 'レミントン', supplierName: '石狩銃砲火薬店', memo: tag };
  let result = await call('createAmmoAction', { ...ammo, transactionDate: '' }, true);
  check('ammo_error_retains_values', !result.success && !!result.fieldErrors.transactionDate && result.values.manufacturer === ammo.manufacturer);
  const beforeDash = (await data.getDashboardSummary()).ammoRegisteredCount;
  check('ammo_purchase', (await call('createAmmoAction', ammo, true)).success);
  const record = await prisma.ammoRecord.findFirstOrThrow({ where: { memo: tag } });
  check('ammo_manufacturer_persisted', record.manufacturer === ammo.manufacturer && record.slipNumber === '7.5');
  for (const [type, qty] of [['TRANSFER_IN', '10'], ['TRANSFER_OUT', '7'], ['DISPOSAL', '3'], ['ADJUST', '5'], ['ADJUST', '-5']]) {
    check('ammo_' + type + '_' + qty, (await call('createAmmoAction', { ...ammo, recordType: type, quantity: qty, memo: tag + type + qty }, true)).success);
  }
  check('dashboard_signed_flow', (await data.getDashboardSummary()).ammoRegisteredCount - beforeDash === 100);
  for (const quantity of ['0', '1.5', '25abc', '', '2147483648', '-2147483648', '-999999']) {
    check('invalid_adjustment_' + quantity, !(await call('createAmmoAction', { ...ammo, recordType: 'ADJUST', quantity }, true)).success);
  }
  check('purchase_negative_rejected', !(await call('createAmmoAction', { ...ammo, quantity: '-5' }, true)).success);
  check('consume_rejected', !(await call('createAmmoAction', { ...ammo, recordType: 'CONSUME' }, true)).success);
  check('adjustment_edit', (await call('upsertAmmoAction', { ...ammo, id: record.id, recordType: 'ADJUST', quantity: '95' })).success);
  check('purchase_edit_back', (await call('upsertAmmoAction', { ...ammo, id: record.id })).success);
  const otherAmmo = await prisma.ammoRecord.create({ data: { userId: foreign.id, recordType: 'PURCHASE', ammoCategory: 'SHOT_SHELL', quantity: 1, transactionDate: new Date(), unit: 'ROUND' } });
  check('ammo_foreign_owner_rejected', !(await call('upsertAmmoAction', { ...ammo, id: otherAmmo.id })).success);

  const gunForm = { category: 'GUN_LICENSE', issuedOn: '20400807', originalPermittedOn: '20400703', notes: tag + '_gun', serialNumber: tag, caliber: '12番', 'barrelType[]': ['SMOOTHBORE', 'HALF_RIFLED'], 'barrelCaliber[]': ['12番', '12番'] };
  const renewalCount = await prisma.renewalRecord.count();
  result = await call('upsertRenewalAction', { ...gunForm, firearmType: 'AUDIT_INVALID' });
  check('renewal_failure_rolls_back', !result.success && await prisma.renewalRecord.count() === renewalCount);
  check('renewal_error_is_short', !/Prisma|invocation|Invalid/.test(result.message || ''));
  check('renewal_create', (await call('upsertRenewalAction', gunForm)).success);
  const renewal = await prisma.renewalRecord.findFirstOrThrow({ where: { notes: gunForm.notes }, include: { firearmRecords: { include: { barrelRecords: true } } } });
  const gun = renewal.firearmRecords[0];
  check('renewal_nested_barrels', gun.barrelRecords.length === 2);
  check('renewal_duplicate_rejected', !(await call('upsertRenewalAction', gunForm)).success);
  check('primary_barrel_switch', (await call('setPrimaryFirearmBarrelRecordAction', { barrelId: gun.barrelRecords[1].id }, true)).success);
  check('primary_barrel_single', await prisma.firearmBarrelRecord.count({ where: { firearmRecordId: gun.id, isPrimary: true, deletedAt: null } }) === 1);
  const activity = { activityType: 'HUNTING', eventDate: '20401001', huntingMethod: 'GUN', targetSpecies: 'エゾシカ', resultCount: '0', prefectureCode: '01', areaName: '当別町', firearmRecordId: gun.id, firearmBarrelRecordId: gun.barrelRecords[1].id, shotShellUsedCount: '3', slugUsedCount: '0', airgunPelletUsedCount: '0', notes: tag + '_event' };
  const eventCount = await prisma.huntingEvent.count();
  result = await call('upsertHuntingEventAction', { ...activity, toolType: 'AUDIT_INVALID' });
  check('activity_failure_rolls_back', !result.success && await prisma.huntingEvent.count() === eventCount);
  check('hunting_create', (await call('upsertHuntingEventAction', activity)).success);
  const event = await prisma.huntingEvent.findFirstOrThrow({ where: { notes: activity.notes }, include: { huntingEventTools: true } });
  check('tool_ids_saved', event.huntingEventTools[0].firearmRecordId === gun.id && event.huntingEventTools[0].firearmBarrelRecordId === gun.barrelRecords[1].id);
  const balance = (await data.getReportPageData()).ammoBalance;
  check('dashboard_matches_reports', (await data.getDashboardSummary()).ammoRegisteredCount === balance.shotShell + balance.slug + balance.airgunPellet);
  result = await call('upsertHuntingEventAction', { ...activity, id: event.id, shotShellUsedCount: '8', toolType: 'AUDIT_INVALID' });
  const unchanged = await prisma.huntingEvent.findUniqueOrThrow({ where: { id: event.id }, include: { huntingEventTools: { where: { deletedAt: null } } } });
  check('activity_edit_failure_rolls_back', !result.success && unchanged.shotShellUsedCount === 3 && unchanged.huntingEventTools[0].id === event.huntingEventTools[0].id);
  for (const huntingMethod of ['TRAP', 'NET']) {
    const values = { ...activity, huntingMethod, firearmRecordId: '', firearmBarrelRecordId: '', notes: tag + huntingMethod };
    check('non_gun_' + huntingMethod, (await call('upsertHuntingEventAction', values)).success);
    const nonGun = await prisma.huntingEvent.findFirstOrThrow({ where: { notes: values.notes } });
    check('non_gun_edit_' + huntingMethod, (await call('upsertHuntingEventAction', { ...values, id: nonGun.id })).success);
  }
  check('gun_requires_selection', !(await call('upsertHuntingEventAction', { ...activity, firearmRecordId: '', firearmBarrelRecordId: '' })).success);
  const shootValues = { ...activity, activityType: 'SHOOTING', shootingType: 'TRAP', shootingRangeName: 'Synthetic Range', notes: tag + '_shoot' };
  check('shooting_requires_selection', !(await call('upsertHuntingEventAction', { ...shootValues, firearmRecordId: '', firearmBarrelRecordId: '' })).success);
  check('shooting_create', (await call('upsertHuntingEventAction', shootValues)).success);
  const shoot = await prisma.huntingEvent.findFirstOrThrow({ where: { notes: shootValues.notes } });
  check('shooting_update', (await call('upsertHuntingEventAction', { ...shootValues, id: shoot.id, shotShellUsedCount: '1' })).success);
  check('shooting_delete', (await call('deleteHuntingEventAction', { id: shoot.id })).success);
  check('report_toggle', (await call('toggleImportedToReportAction', { id: event.id, imported: 'false' })).success);

  const schedule = { renewalRecordId: renewal.id, scheduledOn: '20400425', notes: tag + '_inspect' };
  const races = await Promise.all([call('upsertFirearmInspectionScheduleAction', schedule, true), call('upsertFirearmInspectionScheduleAction', schedule, true)]);
  check('inspection_concurrent_creation_single', races.filter(r => r.success).length === 1 && await prisma.firearmInspectionRecord.count({ where: { renewalRecordId: renewal.id, status: 'SCHEDULED', deletedAt: null } }) === 1);
  const inspection = await prisma.firearmInspectionRecord.findFirstOrThrow({ where: { notes: schedule.notes } });
  check('inspection_bad_date_rejected', !(await call('completeFirearmInspectionAction', { id: inspection.id, inspectedOn: '20400230' }, true)).success);
  check('inspection_complete', (await call('completeFirearmInspectionAction', { id: inspection.id, inspectedOn: '20400425' }, true)).success);
  check('inspection_schedule_cannot_edit_completed', !(await call('upsertFirearmInspectionScheduleAction', { ...schedule, id: inspection.id }, true)).success);
  check('inspection_completed_edit', (await call('updateCompletedFirearmInspectionAction', { id: inspection.id, scheduledOn: '20400426', inspectedOn: '20400426' }, true)).success);
  check('inspection_next', (await call('upsertFirearmInspectionScheduleAction', { ...schedule, scheduledOn: '20410425', notes: tag + '_next' }, true)).success);
  check('inspection_reopen_duplicate_rejected', !(await call('reopenFirearmInspectionAction', { id: inspection.id }, true)).success);
  const stillCompleted = await prisma.firearmInspectionRecord.findUniqueOrThrow({ where: { id: inspection.id } });
  check('inspection_blocked_reopen_preserves_history', stillCompleted.status === 'COMPLETED' && !!stillCompleted.completedAt && !!stillCompleted.inspectedOn);
  const next = await prisma.firearmInspectionRecord.findFirstOrThrow({ where: { notes: tag + '_next' } });
  await call('completeFirearmInspectionAction', { id: next.id, inspectedOn: '20410425' }, true);
  const reopens = await Promise.all([call('reopenFirearmInspectionAction', { id: inspection.id }, true), call('reopenFirearmInspectionAction', { id: next.id }, true)]);
  check('inspection_concurrent_reopen_single', reopens.filter(r => r.success).length === 1 && await prisma.firearmInspectionRecord.count({ where: { renewalRecordId: renewal.id, status: 'SCHEDULED', deletedAt: null } }) === 1);
  const foreignPermit = await prisma.renewalRecord.create({ data: { userId: foreign.id, title: 'Synthetic permit', category: 'GUN_LICENSE' } });
  check('inspection_foreign_owner_rejected', !(await call('upsertFirearmInspectionScheduleAction', { ...schedule, renewalRecordId: foreignPermit.id }, true)).success);
  check('permit_foreign_owner_rejected', !(await call('deleteRenewalAction', { id: foreignPermit.id })).success);
  await prisma.fileRecord.create({ data: { userId: user.id, renewalRecordId: renewal.id, fileCategory: 'LICENSE_COPY', storageKey: '/' + tag + '.webp', originalFileName: 'synthetic.webp', mimeType: 'image/webp', fileSize: 1 } });
  await prisma.$executeRawUnsafe("CREATE FUNCTION regression_reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$");
  await prisma.$executeRawUnsafe('CREATE TRIGGER regression_reject_delete BEFORE UPDATE ON file_records FOR EACH ROW EXECUTE FUNCTION regression_reject_delete()');
  try {
    check('permit_delete_failure', !(await call('deleteRenewalAction', { id: renewal.id })).success);
    check('permit_delete_failure_rolls_back', !(await prisma.renewalRecord.findUniqueOrThrow({ where: { id: renewal.id } })).deletedAt && await prisma.firearmRecord.count({ where: { renewalRecordId: renewal.id, deletedAt: null } }) === 1 && await prisma.firearmInspectionRecord.count({ where: { renewalRecordId: renewal.id, deletedAt: null } }) === 2 && await prisma.firearmBarrelRecord.count({ where: { firearmRecordId: gun.id, deletedAt: null } }) === 2);
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER regression_reject_delete ON file_records');
    await prisma.$executeRawUnsafe('DROP FUNCTION regression_reject_delete()');
  }
  check('permit_delete', (await call('deleteRenewalAction', { id: renewal.id })).success);
  check('permit_children_soft_deleted', await prisma.firearmRecord.count({ where: { renewalRecordId: renewal.id, deletedAt: null } }) === 0 && await prisma.firearmBarrelRecord.count({ where: { firearmRecordId: gun.id, deletedAt: null } }) === 0 && await prisma.firearmInspectionRecord.count({ where: { renewalRecordId: renewal.id, deletedAt: null } }) === 0 && await prisma.fileRecord.count({ where: { renewalRecordId: renewal.id, deletedAt: null } }) === 0);
  check('permit_history_preserved', await prisma.firearmBarrelRecord.count({ where: { firearmRecordId: gun.id } }) === 2 && await prisma.firearmInspectionRecord.count({ where: { renewalRecordId: renewal.id } }) === 2);
  check('activity_tool_history_preserved', await prisma.huntingEventTool.count({ where: { huntingEventId: event.id, deletedAt: null } }) === 1);
  check('deleted_permit_tool_rejected', !(await call('upsertHuntingEventAction', activity)).success);
  check('deleted_permit_inspection_rejected', !(await call('reopenFirearmInspectionAction', { id: inspection.id }, true)).success);
  check('hunting_delete', (await call('deleteHuntingEventAction', { id: event.id })).success);
  check('hunting_delete_tools', await prisma.huntingEventTool.count({ where: { huntingEventId: event.id, deletedAt: null } }) === 0);
  check('ammo_delete', (await call('deleteAmmoAction', { id: record.id })).success);
  const licenseValues = { category: 'HUNTING_LICENSE', issuedOn: '20420807', notes: tag + '_license' };
  check('hunting_license_create', (await call('upsertRenewalAction', licenseValues)).success);
  const license = await prisma.renewalRecord.findFirstOrThrow({ where: { notes: licenseValues.notes } });
  check('hunting_license_update', (await call('updateHuntingLicenseInfoAction', { id: license.id, issuedOn: '20430807' }, true)).success);
  check('hunting_license_delete', (await call('deleteRenewalAction', { id: license.id })).success);
  check('identity_records_remain_attached', (await data.getCurrentUser()).id === user.id && await prisma.renewalRecord.count({ where: { userId: user.id } }) > 0);
}
main().catch(error => { results.push({ name: error.message, passed: false }); process.exitCode = 1; }).finally(async () => {
  console.error = originalError;
  await prisma.$disconnect();
  console.log(JSON.stringify({ frameworkRedirectAndRevalidationStubbed: true, results, errorLogs: logs }));
});
