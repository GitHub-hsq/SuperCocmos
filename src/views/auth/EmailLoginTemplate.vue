<template>
  <!-- 这是我粘贴的email注册页面模板，可以参考一下，输入email，点击Sign up按钮，跳转到验证码页面 ,需要使用邮箱正则表达式验证-->
  <div class="flex h-full flex-grow flex-col items-center justify-center px-5 py-4"><!--$--><!--/$-->
    <div class="mx-auto flex w-full flex-col gap-6 max-w-sm">
      <h1 class="tracking-tight text-2xl sm:text-3xl mb-10 text-center">Sign up with your email</h1>
      <form>
        <div class="flex flex-col gap-1"><label
            class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 font-normal">Email</label>
          <div class="relative"><input
              class="flex w-full border transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1 disabled:opacity-50 h-10 px-3 py-2 sm:text-sm border-[--input-border] bg-[--input-bg] text-[--input-text] w-full [--input-bg:hsl(var(--bg-l1))] [--input-border:hsl(var(--border))] [--input-text:hsl(var(--foreground))]"
              data-testid="email" autocomplete="email" type="email" name="email"></div>
          <p class="text-xs text-destructive min-h-5"></p>
        </div>
        <div class="mt-4 space-y-3"><button type="submit"
            class="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 data-[disabled]:opacity-75 [&amp;>[data-slot=icon]]:-mx-0.5 [&amp;>[data-slot=icon]]:shrink-0 min-h-10 gap-x-3 px-4 py-2 sm:text-sm [&amp;>[data-slot=icon]]:size-5 [&amp;>[data-slot=icon]]:sm:size-4 border-[--btn-border] bg-[--btn-bg] text-[--btn-text] hover:border-[--btn-hover] hover:bg-[--btn-hover] focus:outline-[--btn-bg] [--btn-bg:hsl(var(--primary))] [--btn-border:hsl(var(--primary))] [--btn-hover:hsl(var(--primary-hover))] [--btn-text:hsl(var(--bg-l1))] w-full"><span
              class="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
              aria-hidden="true"></span>Sign up</button><button type="button"
            class="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 data-[disabled]:opacity-75 [&amp;>[data-slot=icon]]:-mx-0.5 [&amp;>[data-slot=icon]]:shrink-0 min-h-10 gap-x-3 px-4 py-2 sm:text-sm [&amp;>[data-slot=icon]]:size-5 [&amp;>[data-slot=icon]]:sm:size-4 border-[--btn-border] bg-[--btn-bg] text-[--btn-text] hover:bg-[--btn-hover] focus:outline-[--btn-text] [--btn-bg:transparent] [--btn-border:hsl(var(--primary)/15%)] [--btn-hover:hsl(var(--bg-overlay-hover))] [--btn-text:hsl(var(--primary))] w-full"><span
              class="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
              aria-hidden="true"></span>Go back</button></div>
      </form>
    </div>
  </div>

  <!-- 这是验证码页面模板，可以参考一下，输入验证码，自动验证，验证成功跳转到信息填写页面 -->
  <div class="flex h-full flex-grow flex-col items-center justify-center px-5 py-4"><!--$--><!--/$-->
    <div class="mx-auto flex w-full flex-col gap-6 max-w-sm">
      <div class="mb-4 text-center">
        <h1 class="tracking-tight text-xl sm:text-2xl">Verify your email</h1>
        <p class="text text-subtle mt-2 text-pretty"><span>We’ve emailed a one time security code to </span><span
            class="text-primary font-medium"><span>2957983240@qq.com（输入的邮箱号）</span></span><span>, please enter it
            below:</span>
        </p>
      </div>
      <form class="grid">
        <div class="flex justify-center">
          <div><noscript></noscript>
            <div data-input-otp-container="true"
              class="flex items-center justify-center gap-2 has-[:disabled]:opacity-50 [&amp;_[data-input-otp]]:!text-base [&amp;_[data-input-otp]]:sm:text-sm"
              style="position: relative; cursor: text; user-select: none; pointer-events: none; --root-height: 36px;">
              <div class="flex items-center">
                <div data-input-otp-slot="true"
                  class="border-input relative flex h-9 w-9 items-center justify-center border-y border-r bg-surface-l1 text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md">
                </div>
                <div data-input-otp-slot="true"
                  class="border-input relative flex h-9 w-9 items-center justify-center border-y border-r bg-surface-l1 text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md">
                </div>
                <div data-input-otp-slot="true"
                  class="border-input relative flex h-9 w-9 items-center justify-center border-y border-r bg-surface-l1 text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md">
                </div>
              </div>
              <div role="separator"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="lucide lucide-minus text-primary opacity-20">
                  <path d="M5 12h14"></path>
                </svg></div>
              <div class="flex items-center">
                <div data-input-otp-slot="true"
                  class="border-input relative flex h-9 w-9 items-center justify-center border-y border-r bg-surface-l1 text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md">
                </div>
                <div data-input-otp-slot="true"
                  class="border-input relative flex h-9 w-9 items-center justify-center border-y border-r bg-surface-l1 text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md">
                </div>
                <div data-input-otp-slot="true"
                  class="border-input relative flex h-9 w-9 items-center justify-center border-y border-r bg-surface-l1 text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md">
                </div>
              </div>
              <div style="position: absolute; inset: 0px; pointer-events: none;"><input autocomplete="one-time-code"
                  class="disabled:cursor-not-allowed" data-input-otp="true" data-input-otp-placeholder-shown="true"
                  inputmode="text" pattern="^[a-zA-Z0-9]+$" maxlength="6" value="" name="code" data-input-otp-mss="0"
                  data-input-otp-mse="0"
                  style="position: absolute; inset: 0px; width: calc(100% + 40px); height: 100%; display: flex; text-align: left; opacity: 1; color: transparent; pointer-events: all; background: transparent; caret-color: transparent; border: 0px solid transparent; outline: transparent solid 0px; box-shadow: none; line-height: 1; letter-spacing: -0.5em; font-size: var(--root-height); font-family: monospace; font-variant-numeric: tabular-nums; clip-path: inset(0px 40px 0px 0px);">
              </div>
            </div>
            <div class="mt-2 min-h-5"></div>
          </div>
        </div>
        <div class="mt-4 space-y-3">
          <button type="button"
            class="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 data-[disabled]:opacity-75 [&amp;>[data-slot=icon]]:-mx-0.5 [&amp;>[data-slot=icon]]:shrink-0 min-h-10 gap-x-3 px-4 py-2 sm:text-sm [&amp;>[data-slot=icon]]:size-5 [&amp;>[data-slot=icon]]:sm:size-4 border-[--btn-border] bg-[--btn-bg] text-[--btn-text] hover:bg-[--btn-hover] focus:outline-[--btn-text] [--btn-bg:transparent] [--btn-border:hsl(var(--primary)/15%)] [--btn-hover:hsl(var(--bg-overlay-hover))] [--btn-text:hsl(var(--primary))] w-full"><span
              class="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
              aria-hidden="true"></span>Go back</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 这里是信息填写页面模板，可以参考一下，输入信息,这里修改为昵称和密码，点击Confirm按钮，跳转到chat页面 -->
  <div class="flex h-full flex-grow flex-col items-center justify-center px-5 py-4"><!--$--><!--/$-->
    <div class="mx-auto flex w-full flex-col gap-6 max-w-sm">
      <div class="mb-10">
        <h1 class="tracking-tight text-2xl sm:text-3xl mb-4 text-center">Complete your sign up</h1>
        <div class="flex justify-center">
          <div class="flex items-center gap-2 rounded-full border bg-surface-l1 px-3 py-1.5 text-sm font-medium"><svg
              xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-mail text-subtle size-4 opacity-75">
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg><span>2957983240@qq.com</span></div>
        </div>
      </div>
      <form><input autocomplete="off" class="hidden" readonly="" type="email" value="2957983240@qq.com" name="email">
        <div class="space-y-4">
          <div class="space-y-1">
            <div class="grid gap-1 sm:grid-cols-2 sm:gap-4">
              <div class="flex flex-col gap-1"><label
                  class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 font-normal">First
                  name</label>
                <div class="relative"><input
                    class="flex w-full border transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1 disabled:opacity-50 h-10 px-3 py-2 sm:text-sm border-[--input-border] bg-[--input-bg] text-[--input-text] w-full [--input-bg:hsl(var(--bg-l1))] [--input-border:hsl(var(--border))] [--input-text:hsl(var(--foreground))]"
                    data-testid="givenName" autocomplete="given-name" type="text" name="givenName"></div>
                <p class="text-xs text-destructive min-h-5"></p>
              </div>
              <div class="flex flex-col gap-1"><label
                  class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 font-normal">Last
                  name</label>
                <div class="relative"><input
                    class="flex w-full border transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1 disabled:opacity-50 h-10 px-3 py-2 sm:text-sm border-[--input-border] bg-[--input-bg] text-[--input-text] w-full [--input-bg:hsl(var(--bg-l1))] [--input-border:hsl(var(--border))] [--input-text:hsl(var(--foreground))]"
                    data-testid="familyName" autocomplete="family-name" type="text" name="familyName"></div>
                <p class="text-xs text-destructive min-h-5"></p>
              </div>
            </div>
            <div class="flex flex-col gap-1"><label
                class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 font-normal">Password</label>
              <div class="relative"><input
                  class="flex w-full border transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1 disabled:opacity-50 h-10 px-3 py-2 sm:text-sm border-[--input-border] bg-[--input-bg] text-[--input-text] pr-10 w-full [--input-bg:hsl(var(--bg-l1))] [--input-border:hsl(var(--border))] [--input-text:hsl(var(--foreground))]"
                  data-testid="password" autocomplete="off" type="password" name="password">
                <div
                  class="pointer text-content-subtle absolute right-2 top-0 flex h-10 w-fit cursor-pointer items-center justify-center gap-3">
                  <div class="flex-shrink-0 overflow-visible size-4"><svg viewBox="0 0 24 24"
                      class="h-full w-full -rotate-90 transform overflow-visible">
                      <circle class="stroke-[4px] stroke-primary/20" cx="12" cy="12" r="11" fill="none"></circle>
                      <circle class="stroke-current stroke-[4px] text-primary" cx="12" cy="12" r="11" fill="none"
                        stroke-dasharray="69.11503837897544" stroke-linecap="round"
                        stroke-dashoffset="69.11503837897544"></circle>
                    </svg></div><button type="button" class="flex" tabindex="-1"><span
                      class="inline-flex items-center justify-center p-0 m-0" data-namespace="@xai/icons"
                      data-slot="icon" style="height: 16px; width: 16px;"><svg xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" class="" focusable="false"
                        style="fill: currentcolor; height: 16px; width: 16px;">
                        <path
                          d="M17.883 19.297A10.95 10.95 0 0 1 12 21c-5.392 0-9.878-3.88-10.818-9A11 11 0 0 1 4.52 5.935L1.394 2.808l1.414-1.414 19.799 19.798-1.414 1.415zM5.936 7.35A8.97 8.97 0 0 0 3.223 12a9.005 9.005 0 0 0 13.201 5.838l-2.028-2.028A4.5 4.5 0 0 1 8.19 9.604zm6.978 6.978-3.242-3.241a2.5 2.5 0 0 0 3.241 3.241m7.893 2.265-1.431-1.431A8.9 8.9 0 0 0 20.778 12 9.005 9.005 0 0 0 9.552 5.338L7.974 3.76C9.221 3.27 10.58 3 12 3c5.392 0 9.878 3.88 10.819 9a10.95 10.95 0 0 1-2.012 4.593m-9.084-9.084Q11.86 7.5 12 7.5a4.5 4.5 0 0 1 4.492 4.778z">
                        </path>
                      </svg></span></button>
                </div>
              </div>
              <p class="text-xs text-destructive min-h-5"></p>
            </div>
          </div>
          <div style="height: 64px; transform: none;">
            <div><input type="hidden" name="cf-turnstile-response" id="cf-chl-widget-38zxq_response"
                value="0.9eSeTctHrRDz1szWMsZ8jkdAS-hpoxam73eOcdXZcnGu8wsVELwR4Xb3aCvzaTjPzjVXhrXld6pwT3DQT9IOxkLwGPIu_1c37bHr9j2klC1t4xHY7GkRhQ6tUmHaZihSL2s0SObOS2YRqDm0QikhVBdOHK9DsIuukU2hRQ-Fd-aVw72QxUbt1hNd6KBiq9-h0nA6leB1FMaocbpyqEH9ZTo6KGhZY_LPYzhsdLpaZyy6rEbWsdNOE7eXVFvbUMxqofhR6kfl0b8Mip2jGsT-ThiUW5JD7r-wWHY710O2VJaMbERKnIIgaCtUhZ8PYDKFHcQ673zxSNFDzQDLJduYrXo0spyq5kW6nlydFUWdnzp0beN2hMFDZ8tBTiNC3GCVsdoFCCrsTELBtl1whfpOYeju4s2CZREfkt099lvhYHeysf2L8sg02jNzIgu7aCuneu3nwz3MBuLMevVykaDRqGJ4OTtbdIjmVC5yjDsvW8-ydED1kn-zV_aDOweRVKLyJBJyo4n2g0ksmgrzCWhlpH9SNBQiXz-1hUS-_dr4akuPG9ujCS_4e9UjZ4ZeKt-s4cYlac_CtXPba_qwnHY7nWVfmzRzx2OWNvGI9KFuyVdEzIh1SmnmCPLzSfMXYlZrj0hhiEbCtBXJNpgQ5r1ZSZfbEta2a8Z4mZc6Ij0JPteZ2ouRxaVE2NoE-TVtoVF8cO2LGjt8ve1_FYbskdc72LmEJMafCYzDHo-nMmmeHCLpemcjltVXxggvi9opA2b81LNXohvWMtkdFKR3VbPzUgNg0wOAtXDnAqltKhVItuNOf2YcyBzbqoI9q3KJkoxU4YYM50Gb8rRhLiJXsAa8-0fGJL3LA2Dnz1Z-Gcjx1M6iGJDdFHdZG2CK6eW5sbkdh57mNdZrnn4s6EpMpxG5R3qFbU6CSqzVrv9uUSJ7hUQ.qkao9EsOnvzFXcAlyXOSNg.31ed5393eb5084f906aa60c6635c1cf64818134bea4a1fbdfd63d428fbbabbe8">
            </div>
          </div>
          <div class="space-y-3"><button type="submit"
              class="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 data-[disabled]:opacity-75 [&amp;>[data-slot=icon]]:-mx-0.5 [&amp;>[data-slot=icon]]:shrink-0 min-h-10 gap-x-3 px-4 py-2 sm:text-sm [&amp;>[data-slot=icon]]:size-5 [&amp;>[data-slot=icon]]:sm:size-4 border-[--btn-border] bg-[--btn-bg] text-[--btn-text] hover:border-[--btn-hover] hover:bg-[--btn-hover] focus:outline-[--btn-bg] [--btn-bg:hsl(var(--primary))] [--btn-border:hsl(var(--primary))] [--btn-hover:hsl(var(--primary-hover))] [--btn-text:hsl(var(--bg-l1))] w-full"><span
                class="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
                aria-hidden="true"></span>Complete sign up</button><button type="button"
              class="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 data-[disabled]:opacity-75 [&amp;>[data-slot=icon]]:-mx-0.5 [&amp;>[data-slot=icon]]:shrink-0 min-h-10 gap-x-3 px-4 py-2 sm:text-sm [&amp;>[data-slot=icon]]:size-5 [&amp;>[data-slot=icon]]:sm:size-4 border-[--btn-border] bg-[--btn-bg] text-[--btn-text] hover:bg-[--btn-hover] focus:outline-[--btn-text] [--btn-bg:transparent] [--btn-border:hsl(var(--primary)/15%)] [--btn-hover:hsl(var(--bg-overlay-hover))] [--btn-text:hsl(var(--primary))] w-full"><span
                class="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
                aria-hidden="true"></span>Go back(返回到上面填写邮箱的地方)</button></div>
        </div>
      </form>
    </div>
  </div>
</template>
1.cloudflare验证码模块暂时不需要；
2.密码需要使用正则表达式验证，至少8位，至少1个大写字母，1个小写字母，1个数字，1个特殊字符；
3.昵称需要使用正则表达式验证，至少2位，不能有特殊字符，防止攻击；
4.这个配置src\store\modules\user\helper.ts，实现里面的“退出登录”这个重定向到home页面；

