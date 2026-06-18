export type LoginIntent = 'oauth:github' | 'oauth:google' | 'password'
type FetcherState = 'idle' | 'loading' | 'submitting'

export function getDisplayedLoginError(
  formError: string | undefined,
  urlError: string | null | undefined,
): string | undefined {
  return formError || urlError || undefined
}

export function getPendingLoginIntent(
  fetcherState: FetcherState,
  submittedIntent: FormDataEntryValue | null | undefined,
  submittedProvider?: FormDataEntryValue | null,
): LoginIntent | null {
  if (fetcherState === 'idle')
    return null

  if (submittedIntent === 'oauth:github' || submittedIntent === 'oauth:google' || submittedIntent === 'password')
    return submittedIntent

  if (submittedIntent === 'oauth' && submittedProvider === 'github')
    return 'oauth:github'
  if (submittedIntent === 'oauth' && submittedProvider === 'google')
    return 'oauth:google'
  if (submittedIntent === 'password')
    return 'password'

  return null
}
