/**
 * Provider sign-up: a company or an individual registers from the app in five steps
 * (type and services, details, address and coverage, documents, confirm). The mobile
 * number is confirmed with a one-time code, then the application is submitted and the
 * owner is signed in to follow it. The SMS is simulated: the code is shown on screen.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { CheckRow, FormView, Values } from '@/components/form';
import {
  areaDef, detailsDef, DocSlot, docTypes, emptyValues, RegSummary, Step, stepOfField, STEPS, TypeStep, validate, withAreaRules,
} from '@/components/registration';
import { errorText } from '@/lib/format';
import { useApp, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Card, Grow, Icon, Notice, Row, Stack, Txt } from '@/ui/core';
import { inputStyle, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

const digits = (s: string) => String(s || '').replace(/\D/g, '');

export default function Register() {
  const t = useT();
  const { signIn } = useApp();
  const { ask, toast } = useDialog();
  const [step, setStep] = useState<Step>('type');
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState('');
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [busy, setBusy] = useState(false);
  const i = STEPS.indexOf(step);
  const phone = values.kind === 'company' ? values.ownerPhone : values.phone;

  const change = (v: Values) => {
    setValues((prev) => withAreaRules(prev, v));
    if (Object.keys(errors).length) setErrors({});
  };
  const go = (s: Step) => { setErrors({}); setStep(s); };

  const next = () => {
    if (step === 'type' || step === 'details' || step === 'area') {
      const errs = validate(values, [step]);
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    go(STEPS[i + 1]);
  };

  const leave = async () => {
    if (i === 0 && !values.kind) { router.back(); return; }
    if (await ask({ title: t('signup.leaveTitle'), message: t('signup.leaveBody'), confirmLabel: t('signup.leave'), danger: true })) router.back();
  };

  const sendCode = () => {
    const errs = validate(values, ['submit'], { terms: true });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSent(String(Math.floor(100000 + Math.random() * 900000)));
    setCode('');
    setCodeErr('');
  };

  const submit = async () => {
    if (digits(code) !== sent) { setCodeErr(t('login.wrongCode')); return; }
    setBusy(true);
    try {
      const all = validate(values, ['type', 'details', 'area', 'submit'], { terms: true });
      const first = Object.keys(all)[0];
      if (first) { setErrors(all); setSent(''); setStep(stepOfField(first)); return; }
      const res = await services().registration.submit(values);
      await signIn(res.userId);
      toast(t('signup.received', { ref: res.ref }));
      router.replace('/application');
    } catch (e: any) {
      const field = e?.params?.field;
      if (field) {
        setErrors({ ...(e.params.errors || {}), [field]: e.key });
        setSent('');
        setStep(stepOfField(field));
      }
      toast(errorText(e), 'danger');
    } finally { setBusy(false); }
  };

  const footer = step === 'confirm' ? null : (
    <Row gap={10}>
      {i > 0 ? <Grow><Button label={t('common.back')} icon="chevronLeft" onPress={() => go(STEPS[i - 1])} block /></Grow> : null}
      <Grow><Button label={t('common.next')} kind="primary" onPress={next} block /></Grow>
    </Row>
  );

  return (
    <Screen title={t('reg.title')} sub={t('reg.stepOf', { n: i + 1, total: STEPS.length }) + ' · ' + t('signup.step.' + step)} footer={footer}
      right={<Pressable onPress={leave} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10}><Icon name="x" size={20} /></Pressable>}>
      <Progress index={i} />
      {Object.keys(errors).length ? <Notice tone="danger" text={t('reg.fixErrors')} /> : null}

      {step === 'type' ? (
        <>
          <Txt c="muted">{t('reg.intro')}</Txt>
          <TypeStep values={values} onChange={change} errors={errors} />
        </>
      ) : null}

      {step === 'details' ? <Card><FormView def={detailsDef(values.kind)} values={values} errors={errors} onChange={change} /></Card> : null}

      {step === 'area' ? <Card><FormView def={areaDef(values)} values={values} errors={errors} onChange={change} /></Card> : null}

      {step === 'docs' ? (
        <Stack>
          <Txt c="muted">{t('signup.docsIntro')}</Txt>
          {docTypes(values.kind).map((tp) => (
            <DocSlot key={tp} type={tp} file={values.docs?.[tp]} onFile={(file) => setValues((v) => ({ ...v, docs: { ...(v.docs || {}), [tp]: file } }))} />
          ))}
          <Txt v="xs" c="faint">{t('signup.docsLater')}</Txt>
        </Stack>
      ) : null}

      {step === 'confirm' ? (
        <Stack gap={space.lg}>
          <Card title={t('reg.sec.review')} right={<Button small kind="ghost" icon="edit" label={t('common.edit')} onPress={() => go('type')} />}>
            <RegSummary values={values} />
          </Card>
          <DocsLine values={values} onEdit={() => go('docs')} />
          <Card>
            <Stack>
              <CheckRow on={!!values.terms} onPress={() => change({ ...values, terms: !values.terms })} bad={!!errors.terms}>
                <Txt v="sm">{t('signup.terms')}</Txt>
              </CheckRow>
              {errors.terms ? <Txt v="xs" c="bad">{t(errors.terms)}</Txt> : null}
            </Stack>
          </Card>
          <Card title={t('signup.verifyTitle')}>
            {!sent ? (
              <Stack>
                <Txt c="muted">{t('signup.verifyBody', { phone: phone || '-' })}</Txt>
                <Button label={t('login.sendCode')} kind="primary" icon="send" onPress={sendCode} block />
                <Button label={t('common.back')} icon="chevronLeft" onPress={() => go('docs')} block />
              </Stack>
            ) : (
              <Stack>
                <Txt c="muted">{t('login.codeSent', { phone })}</Txt>
                <Notice tone="info" text={t('login.demoCode', { code: sent })} />
                <TextInput value={code} onChangeText={(v) => { setCode(digits(v).slice(0, 6)); setCodeErr(''); }} keyboardType="number-pad" maxLength={6}
                  autoComplete="one-time-code" textContentType="oneTimeCode" placeholder="000000" onSubmitEditing={submit} accessibilityLabel={t('login.codeTitle')}
                  style={[inputStyle, { textAlign: 'center', fontSize: 24, letterSpacing: 10, writingDirection: 'ltr' }]} />
                {codeErr ? <Txt v="sm" c="bad">{codeErr}</Txt> : null}
                <Button label={t('reg.submitCta')} kind="primary" icon="check" onPress={submit} disabled={code.length !== 6} busy={busy} block />
                <Button label={t('login.changeNumber')} kind="ghost" onPress={() => { setSent(''); go('details'); }} />
              </Stack>
            )}
          </Card>
        </Stack>
      ) : null}
    </Screen>
  );
}

/** Step progress bar. */
function Progress({ index }: { index: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {STEPS.map((s, k) => (
        <View key={s} style={{ flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: k <= index ? colors.accent : colors.border }} />
      ))}
    </View>
  );
}

/** How many documents are attached, with a way back to the documents step. */
function DocsLine({ values, onEdit }: { values: Values; onEdit: () => void }) {
  const t = useT();
  const types = docTypes(values.kind);
  const n = types.filter((tp) => values.docs?.[tp]).length;
  const missing = types.length - n;
  return (
    <Card title={t('reg.sec.documents')} right={<Button small kind="ghost" icon="edit" label={t('common.edit')} onPress={onEdit} />}>
      <Stack gap={8}>
        <Txt v="sm">{t('signup.docsCount', { n: icm().util.num(n), total: icm().util.num(types.length) })}</Txt>
        {missing ? <Notice tone="warning" text={t('signup.docsMissing', { n: icm().util.num(missing) })} /> : null}
      </Stack>
    </Card>
  );
}
