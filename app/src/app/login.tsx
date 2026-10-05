/**
 * Sign in. Service providers use their mobile number and a one-time code; organisations
 * that request work use their work email, a password and a one-time code. No SMS or email
 * provider is chosen yet, so the code is generated on the device and shown in a demo notice.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icm, services } from '@/backend/engine';
import { errorText } from '@/lib/format';
import { useApp, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Notice, Row, Segmented, Stack, Txt } from '@/ui/core';
import { inputStyle } from '@/ui/dialogs';

const digits = (s: string) => s.replace(/\D/g, '');
const newCode = () => String(Math.floor(100000 + Math.random() * 900000));
type Mode = 'provider' | 'client';

export default function Login() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { signIn, lang, setLang } = useApp();
  const [mode, setMode] = useState<Mode>('provider');
  const [step, setStep] = useState<'start' | 'code'>('start');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [userId, setUserId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const toCode = (id: string, to: string) => {
    setUserId(id);
    setSentTo(to);
    setSent(newCode());
    setCode('');
    setErr('');
    setStep('code');
  };

  const sendPhoneCode = async () => {
    setErr('');
    const p = digits(phone);
    const users: any[] = await services().auth.listDemoUsers();
    const u = users.find((x) => x.phone && digits(x.phone) === p && x.portal !== 'entity' && x.portal !== 'admin');
    if (!u) { setErr(t('login.notFound')); return; }
    toCode(u.id, phone);
  };

  const checkPassword = async () => {
    setErr('');
    setBusy(true);
    try {
      const r: any = await services().auth.checkPassword(email, password);
      setPassword('');
      toCode(r.userId, r.maskedEmail);
    } catch (e) {
      setErr(errorText(e));
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (digits(code) !== sent) { setErr(t('login.wrongCode')); return; }
    setBusy(true);
    try { await signIn(userId); router.replace('/'); } finally { setBusy(false); }
  };

  const switchMode = (m: Mode) => { setMode(m); setStep('start'); setErr(''); setForgot(false); };
  const ltrInput = { textAlign: 'left' as const, writingDirection: 'ltr' as const };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: space.xl }}>
          <Row between>
            <Row gap={10}>
              <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Txt c="white" b>{lang === 'ar' ? 'م' : 'M'}</Txt>
              </View>
              <Txt v="h2">{t('app.name')}</Txt>
            </Row>
            <Pressable onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} accessibilityRole="button" hitSlop={8}>
              <Txt c="accent" b>{lang === 'ar' ? 'English' : 'العربية'}</Txt>
            </Pressable>
          </Row>
          <Txt c="muted">{t('app.tagline')}</Txt>

          {step === 'start' ? (
            <Stack>
              <Txt v="title">{t('login.title')}</Txt>
              <Segmented items={[{ id: 'provider', label: t('login.asProvider') }, { id: 'client', label: t('login.asClient') }]} value={mode} onChange={(m) => switchMode(m as Mode)} />
              {mode === 'provider' ? (
                <>
                  <Stack gap={6}>
                    <Txt v="sm" b c="muted">{t('login.phoneLabel')}</Txt>
                    <TextInput value={phone} onChangeText={(v) => { setPhone(v); setErr(''); }} keyboardType="phone-pad" placeholder="01XXXXXXXXX"
                      autoComplete="tel" textContentType="telephoneNumber" style={[inputStyle, ltrInput, { fontSize: 18, letterSpacing: 1 }]}
                      onSubmitEditing={sendPhoneCode} accessibilityLabel={t('login.phoneLabel')} />
                    <Txt v="xs" c="faint">{t('login.phoneHint')}</Txt>
                  </Stack>
                  {err ? <Notice tone="danger" text={err} /> : null}
                  <Button label={t('login.sendCode')} kind="primary" onPress={sendPhoneCode} disabled={digits(phone).length < 10} block />
                </>
              ) : (
                <>
                  <Txt v="sm" c="muted">{t('login.clientIntro')}</Txt>
                  <Stack gap={6}>
                    <Txt v="sm" b c="muted">{t('login.emailLabel')}</Txt>
                    <TextInput value={email} onChangeText={(v) => { setEmail(v); setErr(''); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                      autoComplete="email" textContentType="username" placeholder="name@company.com" style={[inputStyle, ltrInput]} accessibilityLabel={t('login.emailLabel')} />
                  </Stack>
                  <Stack gap={6}>
                    <Txt v="sm" b c="muted">{t('login.passwordLabel')}</Txt>
                    <Row gap={8}>
                      <TextInput value={password} onChangeText={(v) => { setPassword(v); setErr(''); }} secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false}
                        autoComplete="current-password" textContentType="password" onSubmitEditing={checkPassword}
                        style={[inputStyle, ltrInput, { flex: 1 }]} accessibilityLabel={t('login.passwordLabel')} />
                      <Pressable onPress={() => setShowPw(!showPw)} accessibilityRole="button" hitSlop={8}>
                        <Txt c="accent" b v="sm">{showPw ? t('login.hide') : t('login.show')}</Txt>
                      </Pressable>
                    </Row>
                  </Stack>
                  {err ? <Notice tone="danger" text={err} /> : null}
                  <Notice tone="info" text={t('login.demoPassword', { pw: icm().config.DEMO_PASSWORD })} />
                  <Button label={t('login.continue')} kind="primary" onPress={checkPassword} disabled={!email.trim() || !password} busy={busy} block />
                  <Button label={t('login.forgot')} kind="ghost" onPress={() => setForgot(!forgot)} />
                  {forgot ? <Notice tone="info" text={t('login.forgotBody')} /> : null}
                </>
              )}
            </Stack>
          ) : (
            <Stack>
              <Txt v="title">{t('login.codeTitle')}</Txt>
              <Txt c="muted">{mode === 'provider' ? t('login.codeSent', { phone: sentTo }) : t('login.codeSentEmail', { email: sentTo })}</Txt>
              <Notice tone="info" text={t(mode === 'provider' ? 'login.demoCode' : 'login.demoCodeEmail', { code: sent })} />
              <TextInput value={code} onChangeText={(v) => { setCode(digits(v).slice(0, 6)); setErr(''); }} keyboardType="number-pad" maxLength={6}
                autoComplete="one-time-code" textContentType="oneTimeCode" placeholder="000000" onSubmitEditing={verify}
                style={[inputStyle, { textAlign: 'center', fontSize: 26, letterSpacing: 10, writingDirection: 'ltr' }]} accessibilityLabel={t('login.codeTitle')} />
              {err ? <Notice tone="danger" text={err} /> : null}
              <Button label={t('login.verify')} kind="primary" onPress={verify} disabled={code.length !== 6} busy={busy} block />
              <Button label={mode === 'provider' ? t('login.changeNumber') : t('login.back')} kind="ghost" onPress={() => { setStep('start'); setErr(''); }} />
            </Stack>
          )}

          {mode === 'provider' ? (
            <>
              <View style={{ height: 1, backgroundColor: colors.border }} />
              <Stack gap={8}>
                <Txt b>{t('login.registerTitle')}</Txt>
                <Txt v="sm" c="muted">{t('login.registerBody')}</Txt>
                <Button label={t('login.registerCta')} icon="plus" onPress={() => router.push('/register')} block />
              </Stack>
            </>
          ) : null}
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Stack gap={8}>
            <Txt v="sm" c="muted">{t('login.demoAccountsHint')}</Txt>
            <Button label={t('login.demoAccounts')} icon="users" onPress={() => router.push('/demo')} block />
          </Stack>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
