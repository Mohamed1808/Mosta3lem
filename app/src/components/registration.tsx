/**
 * Provider registration pieces shared by sign-up and the application screens: the step
 * layouts (built on FormView), the provider type and service cards, document slots and
 * the summary. Validation is the engine's wf.validateRegistration, so the rules match the
 * prototype and the future API.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { icm } from '@/backend/engine';
import { DataImage } from '@/components/case';
import { Values } from '@/components/form';
import { takePhoto } from '@/lib/camera';
import { addressLine, coverageText } from '@/lib/format';
import { useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Badge, Button, Grow, Icon, KeyValue, Row, Stack, Txt, useDir } from '@/ui/core';

export type Step = 'type' | 'details' | 'area' | 'docs' | 'confirm';
export const STEPS: Step[] = ['type', 'details', 'area', 'docs', 'confirm'];

/** Which wizard step owns each field, so a server error can send the person back to it. */
const FIELD_STEP: Record<string, Step> = {
  kind: 'type', services: 'type', terms: 'confirm',
  addrGov: 'area', addrCity: 'area', addrStreet: 'area', addrLandmark: 'area', coverage: 'area',
};
export const stepOfField = (name: string): Step => FIELD_STEP[name] || 'details';

export const emptyValues = (): Values => ({ kind: '', services: [], coverage: {}, docs: {}, focalSame: true });

/** Errors for some steps (the engine's validation limited to those steps). */
export function validate(values: Values, steps: string[], opts: { terms?: boolean } = {}) {
  const ICM = icm();
  const govs = ICM.store.db.config.lists.governorates.map((g: any) => g.id);
  return ICM.wf.validateRegistration(values, { steps, now: ICM.clock.now(), requireTerms: !!opts.terms, governorates: govs }) as Record<string, string>;
}

export const docTypes = (kind: string): string[] => icm().wf.registrationDocs(kind === 'company' ? 'company' : 'individual');

// ---------------------------------------------------------------- form layouts
const f = (name: string, type: string, extra: Record<string, any> = {}) => ({ name, type, label: 'reg.f.' + name, ...extra });

/** Company or individual details, as FormView sections. */
export function detailsDef(kind: string) {
  if (kind === 'company') {
    return {
      id: 'reg', sections: [
        { id: 'company', title: 'reg.sec.company', fields: [
          f('companyName', 'text', { required: true }),
          f('taxId', 'digits', { required: true, max: 9, placeholder: '123456789', hint: 'reg.hint.taxId' }),
          f('commercialRegNo', 'digits', { required: true, max: 10, hint: 'reg.hint.commercialReg' }),
          f('mainPhone', 'anyPhone', { required: true, placeholder: '02XXXXXXXX', hint: 'reg.hint.mainPhone' }),
          f('companyEmail', 'email'),
        ] },
        { id: 'owner', title: 'reg.sec.owner', intro: 'reg.ownerIntro', fields: [
          f('ownerName', 'text', { required: true }),
          f('ownerPhone', 'phone', { required: true, hint: 'reg.hint.ownerPhone' }),
          f('ownerNationalId', 'nationalId', { required: true }),
          f('ownerEmail', 'email'),
        ] },
        { id: 'focal', title: 'reg.sec.focal', intro: 'reg.focalIntro', fields: [
          { name: 'focalSame', type: 'checkbox', label: 'reg.focalSame' },
          f('focalName', 'text', { required: true, showIf: (v: Values) => !v.focalSame }),
          f('focalTitle', 'text', { showIf: (v: Values) => !v.focalSame }),
          f('focalPhone', 'phone', { required: true, showIf: (v: Values) => !v.focalSame }),
          f('focalEmail', 'email', { showIf: (v: Values) => !v.focalSame }),
        ] },
      ],
    };
  }
  return {
    id: 'reg', fields: [
      f('fullName', 'text', { required: true, hint: 'reg.hint.fullName' }),
      f('nationalId', 'nationalId', { required: true }),
      f('phone', 'phone', { required: true, hint: 'reg.hint.phone' }),
      f('email', 'email'),
    ],
  };
}

/** Address (head office or home) and the areas covered. The city list follows the governorate. */
export function areaDef(values: Values) {
  const ICM = icm();
  const company = values.kind === 'company';
  const cities = values.addrGov ? (ICM.config.citiesOf(values.addrGov) as any[]) : [];
  const city = values.addrGov && !cities.length
    ? { name: 'addrCity', type: 'text', label: 'address.city', required: true }
    : { name: 'addrCity', type: 'select', label: 'address.city', required: true, choices: cities.map((c) => ({ value: c.id, label: ICM.util.label(c) })) };
  return {
    id: 'reg', sections: [
      { id: 'address', title: company ? 'reg.sec.hq' : 'reg.sec.address', fields: [
        { name: 'addrGov', type: 'governorate', label: 'address.governorate', required: true },
        city,
        f('addrStreet', 'text', { required: true }),
        f('addrLandmark', 'text'),
      ] },
      { id: 'coverage', title: 'reg.sec.coverage', intro: company ? 'reg.coverageIntroCompany' : 'reg.coverageIntroIndividual', fields: [
        { name: 'coverage', type: 'coverage', label: 'reg.detail.coverage', required: true },
      ] },
    ],
  };
}

/** When the governorate changes, a city from the old one no longer applies. */
export function withAreaRules(prev: Values, next: Values): Values {
  if (prev.addrGov !== next.addrGov) return { ...next, addrCity: '' };
  return next;
}

// ---------------------------------------------------------------- type and services
function ChoiceCard({ on, icon, title, body, onPress, radio }: { on: boolean; icon: string; title: string; body: string; onPress: () => void; radio?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole={radio ? 'radio' : 'checkbox'} accessibilityState={{ checked: on }} accessibilityLabel={title}
      style={{ borderWidth: on ? 2 : 1, borderColor: on ? colors.accent : colors.borderStrong, borderRadius: radius.lg, padding: on ? space.md - 1 : space.md, backgroundColor: on ? colors.accentSoft : colors.surface }}>
      <Row gap={12} center={false}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: on ? colors.surface : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} color={on ? colors.accent : colors.text2} />
        </View>
        <Grow>
          <Txt b>{title}</Txt>
          <Txt v="sm" c="muted">{body}</Txt>
        </Grow>
        <Icon name={on ? 'check' : 'plus'} size={16} color={on ? colors.accent : colors.text3} />
      </Row>
    </Pressable>
  );
}

/** Provider type (fixed once registered) and the services offered. */
export function TypeStep({ values, onChange, errors, kindLocked }: { values: Values; onChange: (v: Values) => void; errors: Record<string, string>; kindLocked?: boolean }) {
  const t = useT();
  const services: string[] = values.services || [];
  const toggle = (s: string) => onChange({ ...values, services: services.indexOf(s) >= 0 ? services.filter((x) => x !== s) : services.concat([s]) });
  return (
    <Stack gap={space.xl}>
      {kindLocked ? null : (
        <Stack gap={10}>
          <Txt v="h3">{t('reg.q.kind')}</Txt>
          <ChoiceCard radio on={values.kind === 'company'} icon="building" title={t('reg.kind.company')} body={t('reg.kind.companyBody')} onPress={() => onChange({ ...values, kind: 'company' })} />
          <ChoiceCard radio on={values.kind === 'individual'} icon="user" title={t('reg.kind.individual')} body={t('reg.kind.individualBody')} onPress={() => onChange({ ...values, kind: 'individual' })} />
          {errors.kind ? <Txt v="xs" c="bad">{t(errors.kind)}</Txt> : null}
        </Stack>
      )}
      <Stack gap={10}>
        <Txt v="h3">{t('reg.q.services')}</Txt>
        <ChoiceCard on={services.indexOf('investigation') >= 0} icon="search" title={t('service.investigation')} body={t('reg.svc.investigationBody')} onPress={() => toggle('investigation')} />
        <ChoiceCard on={services.indexOf('collection') >= 0} icon="coins" title={t('service.collection')} body={t('reg.svc.collectionBody')} onPress={() => toggle('collection')} />
        <Txt v="xs" c="faint">{t('reg.svc.bothHint')}</Txt>
        {errors.services ? <Txt v="xs" c="bad">{t(errors.services)}</Txt> : null}
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------- documents
export type DocFile = { name?: string | null; url?: string | null; status?: string };

/**
 * One document: label, status, thumbnail and camera / library buttons.
 * onFile receives { name, url } with the photo as a data URL; omit it to show read only.
 */
export function DocSlot({ type, file, onFile, locked }: { type: string; file?: DocFile | null; onFile?: (f: { name: string; url: string }) => Promise<void> | void; locked?: boolean }) {
  const t = useT();
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);
  const has = !!(file && (file.url || file.name));
  const status = file?.status || (has ? 'uploaded' : 'missing');
  const grab = async (src: 'camera' | 'library') => {
    setBusy(src);
    try {
      const url = await takePhoto(src, 1000);
      if (url && onFile) await onFile({ name: type + '.jpg', url });
    } finally { setBusy(null); }
  };
  const tone = status === 'verified' ? 'success' : status === 'missing' ? 'danger' : 'pending';
  const badge = status === 'verified' ? 'docStatus.verified' : status === 'missing' ? 'docStatus.rejected' : 'docStatus.pending';
  return (
    <View style={{ borderWidth: 1, borderColor: has ? colors.border : colors.borderStrong, borderStyle: has ? 'solid' : 'dashed', borderRadius: radius.md, padding: space.md, backgroundColor: has ? colors.surface : colors.surface2, gap: 10 }}>
      <Row gap={12}>
        {file?.url ? <DataImage uri={file.url} width={64} height={44} /> : (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="file" color={colors.accent} />
          </View>
        )}
        <Grow>
          <Txt v="sm" b>{t('doc.' + type)}</Txt>
          {file?.name && !file.url ? <Txt v="xs" c="muted" numberOfLines={1}>{file.name}</Txt> : null}
        </Grow>
        <Badge label={t(badge)} tone={tone} />
      </Row>
      {onFile && !locked && status !== 'verified' ? (
        <Row gap={8} wrap>
          <Button small icon="camera" kind={has ? 'secondary' : 'primary'} label={has ? t('reg.replaceFile') : t('field.takePhoto')} busy={busy === 'camera'} onPress={() => grab('camera')} />
          <Button small kind="ghost" label={t('field.choosePhoto')} busy={busy === 'library'} onPress={() => grab('library')} />
        </Row>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- summary
/** What the applicant entered, in the order of the steps. */
export function RegSummary({ values }: { values: Values }) {
  const t = useT();
  const d = useDir();
  const company = values.kind === 'company';
  const sep = t('common.listSep');
  const ltr = (x: any) => (x ? <Txt v="sm" ltr style={{ textAlign: d.align }}>{String(x)}</Txt> : '-');
  const rows: [string, any][] = [
    [t('reg.f.kind'), values.kind ? t('reg.kind.' + values.kind) : '-'],
    [t('profile.services'), (values.services || []).map((s: string) => t('service.' + s)).join(sep) || '-'],
  ];
  if (company) {
    rows.push(
      [t('reg.f.companyName'), values.companyName || '-'],
      [t('reg.f.taxId'), ltr(values.taxId)],
      [t('reg.f.commercialRegNo'), ltr(values.commercialRegNo)],
      [t('reg.f.mainPhone'), ltr(values.mainPhone)],
      [t('reg.sec.owner'), [values.ownerName, values.ownerPhone].filter(Boolean).join(' · ') || '-'],
      [t('reg.f.ownerNationalId'), ltr(values.ownerNationalId)],
      [t('reg.sec.focal'), values.focalSame ? t('reg.focalIsOwner') : [values.focalName, values.focalTitle, values.focalPhone].filter(Boolean).join(' · ') || '-'],
    );
  } else {
    rows.push(
      [t('reg.f.fullName'), values.fullName || '-'],
      [t('reg.f.nationalId'), ltr(values.nationalId)],
      [t('reg.f.phone'), ltr(values.phone)],
    );
    if (values.email) rows.push([t('reg.f.email'), ltr(values.email)]);
  }
  rows.push(
    [company ? t('reg.sec.hq') : t('reg.detail.address'), values.addrGov ? addressLine({ street: values.addrStreet, city: cityLabel(values.addrGov, values.addrCity), governorate: values.addrGov }) : '-'],
    [t('reg.detail.coverage'), coverageText(values.coverage) || '-'],
  );
  return <KeyValue rows={rows} />;
}

function cityLabel(gov: string, city: string) {
  const c = icm().config.cityLabel(gov, city);
  return c ? icm().util.label(c) : city;
}
