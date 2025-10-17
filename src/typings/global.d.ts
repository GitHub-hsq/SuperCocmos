interface Window {
  $loadingBar?: import('naive-ui').LoadingBarProviderInst
  $dialog?: import('naive-ui').DialogProviderInst
  $message?: import('naive-ui').MessageProviderInst
  $notification?: import('naive-ui').NotificationProviderInst
  Clerk?: {
    session?: {
      getToken: (options?: { template?: string }) => Promise<string | null>
    }
    user?: any
    client?: any
  }
}
