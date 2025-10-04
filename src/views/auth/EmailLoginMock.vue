<template>
  这是点击“使用邮箱登录”按钮后，切换的表单，页面模板如下：
  <div class="flex w-full flex-grow items-center justify-center">
    <div class="mx-auto flex w-full flex-col gap-6 max-w-sm">
      <form class="space-y-4">
        <h1 class="tracking-tight text-2xl sm:text-3xl mb-10 text-center">Log in with your email</h1>
        <div class="space-y-2">
          <div class="flex flex-col gap-1"><label
              class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 font-normal">Email</label>
            <div class="relative"><input
                class="flex w-full border transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1 disabled:opacity-50 h-10 px-3 py-2 sm:text-sm border-[--input-border] bg-[--input-bg] text-[--input-text] w-full [--input-bg:hsl(var(--bg-l1))] [--input-border:hsl(var(--border))] [--input-text:hsl(var(--foreground))]"
                data-testid="email" autocomplete="email" type="email" name="email"></div>
            <p class="text-xs text-destructive min-h-5"></p>
          </div>
        </div>
        <div class="space-y-3"><button type="submit"
            class="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 data-[disabled]:opacity-75 [&amp;>[data-slot=icon]]:-mx-0.5 [&amp;>[data-slot=icon]]:shrink-0 min-h-10 gap-x-3 px-4 py-2 sm:text-sm [&amp;>[data-slot=icon]]:size-5 [&amp;>[data-slot=icon]]:sm:size-4 border-[--btn-border] bg-[--btn-bg] text-[--btn-text] hover:border-[--btn-hover] hover:bg-[--btn-hover] focus:outline-[--btn-bg] [--btn-bg:hsl(var(--primary))] [--btn-border:hsl(var(--primary))] [--btn-hover:hsl(var(--primary-hover))] [--btn-text:hsl(var(--bg-l1))] w-full"><span
              class="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
              aria-hidden="true"></span>Next</button><button type="button"
            class="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 data-[disabled]:opacity-75 [&amp;>[data-slot=icon]]:-mx-0.5 [&amp;>[data-slot=icon]]:shrink-0 min-h-10 gap-x-3 px-4 py-2 sm:text-sm [&amp;>[data-slot=icon]]:size-5 [&amp;>[data-slot=icon]]:sm:size-4 border-[--btn-border] bg-[--btn-bg] text-[--btn-text] hover:bg-[--btn-hover] focus:outline-[--btn-text] [--btn-bg:transparent] [--btn-border:hsl(var(--primary)/15%)] [--btn-hover:hsl(var(--bg-overlay-hover))] [--btn-text:hsl(var(--primary))] w-full"><span
              class="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
              aria-hidden="true"></span>Go back</button></div>
      </form>
      <div class="text-center">
        <p class="text-sm text-muted">Don't have an account?<!-- --> <a class="text-primary hover:underline"
            href="/sign-up">Sign up</a></p>
      </div>
    </div>
  </div>

  这是点击“Next”按钮，加载loading，邮箱验证通过后，切换的表单，页面模板如下：
  <div class="flex w-full flex-grow items-center justify-center">
    <div class="mx-auto flex w-full flex-col gap-6 max-w-sm">
      <form class="space-y-4">
        <h1 class="tracking-tight text-2xl sm:text-3xl mb-10 text-center">Log in with your email</h1>
        <div class="space-y-2">
          <div class="flex flex-col gap-1"><label
              class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 font-normal">Email</label>
            <div class="relative"><input
                class="flex w-full border transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1 disabled:opacity-50 h-10 px-3 py-2 sm:text-sm border-[--input-border] bg-[--input-bg] text-[--input-text] w-full [--input-bg:hsl(var(--bg-l1))] [--input-border:hsl(var(--border))] [--input-text:hsl(var(--foreground))]"
                data-testid="email" autocomplete="email" type="email" name="email" readonly=""></div>
            <p class="text-xs text-destructive min-h-5"></p>
          </div>
          <div class="flex flex-col gap-1"><label
              class="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 font-normal">
              <div class="flex items-center justify-between"><span>Password</span>
                <div style="transform: none;"><a tabindex="-1" href="/reset-password?email=2957983240%40qq.com">
                    <p class="text-xs text-muted hover:underline">Forgot your password?</p>
                  </a></div>
              </div>
            </label>
            <div class="relative"><input
                class="flex w-full border transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1 disabled:opacity-50 h-10 px-3 py-2 sm:text-sm border-[--input-border] bg-[--input-bg] text-[--input-text] pr-10 w-full [--input-bg:hsl(var(--bg-l1))] [--input-border:hsl(var(--border))] [--input-text:hsl(var(--foreground))]"
                autocomplete="off" type="password" name="password">
              <div
                class="pointer text-content-subtle absolute right-2 top-0 flex h-10 w-fit cursor-pointer items-center justify-center gap-3">
                <button type="button" class="flex" tabindex="-1"><span
                    class="inline-flex items-center justify-center p-0 m-0" data-namespace="@xai/icons" data-slot="icon"
                    style="height: 16px; width: 16px;"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor"
                      viewBox="0 0 24 24" aria-hidden="true" class="" focusable="false"
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
          <div><input type="hidden" name="cf-turnstile-response" id="cf-chl-widget-cetq8_response"
              value="0.kBMjLrYXgF_9JSwBjtw4n5S51FfiWNcG_Cp9yKQ6EVrfOvkJjfVBiPvBAi1wQqZP9j3yw6T_bP9M88M-_6qc5mFZUjfXf58qif4eJfANyboAdefS3x9zkorDF_T2ZXUEe9eoCBIwaaG62zygoYM33fR6N4kbf_hTFgSJGGQA9NzD02nBWZaTfnTgLJQCjTXK4J24BKAvuIJyd262bT72A863QCTUqnCiOwvGsu1X47pIn_Uii6DRT1nvUlevjCp-xjzDG5ymEyloCRRkwPGVUCFEgHaviTN-8MPj4dqFY_z8OQLcD7vwDkqtdrp-EZ9s2lSokleNXORJHkliXzce1LZlwEQP9lkfry-bYiU7318-XEZixfz_iML-oTWefi2MWNTqalKxznHlKqW6YR3fEEqn7W7AEPTXdlSvPAy0QjLfAgPm6BWv3YQ31xlpzjClp-_dlCUxAdw1zUzjWXV18SPoN-zTv9jlxsUO68CLk6g_FjGnF136hY1gO9_KZwRKOCoqAPx5SW4h0awpB4F0hhUFnykkFkC4t751Mn1QuXxt2O-guKgL3Ag8_sC5R3FZm7szDQcrSuKsAL3Gig8D1WbUS6JETcY0V95UHzGDieGlSGbKB2lUrarzG4BQ5atydp_6H0hmdioM7LT6YfBZNhEsEqiz8U_p1T4js-5_aCeo1Eceqrwot6xwfNFR2BPzCijBm5c0lmm1gkXx1nA4JoEScz3ANHJO4mRtAucg6Y2yUOrx0KgDMdPEn1MGxzxjpsZLYBQ8fDrG4uO2dDt5ag_R-5RZ0W5g44VHq7SvLm_PsBv60doFSwVfjP1qU7wG7keAdta3OhFQZd95K683Zb4GCViVpVAq-vf4ND0NOHqM85nVOqSThbRKOQbQVu_ZCIV6pBdVaIczu_CEw2LlXy6MjOoWO2LvyAIHaswxgUA.KUbpg-JZS7jRPz312wXYZw.3c1a67555dc703c3262727d3fb6e4c09b7e429ec425c7b901eadc0193e10c453">
          </div>
        </div>
        <div class="space-y-3"><button type="submit"
            class="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 data-[disabled]:opacity-75 [&amp;>[data-slot=icon]]:-mx-0.5 [&amp;>[data-slot=icon]]:shrink-0 min-h-10 gap-x-3 px-4 py-2 sm:text-sm [&amp;>[data-slot=icon]]:size-5 [&amp;>[data-slot=icon]]:sm:size-4 border-[--btn-border] bg-[--btn-bg] text-[--btn-text] hover:border-[--btn-hover] hover:bg-[--btn-hover] focus:outline-[--btn-bg] [--btn-bg:hsl(var(--primary))] [--btn-border:hsl(var(--primary))] [--btn-hover:hsl(var(--primary-hover))] [--btn-text:hsl(var(--bg-l1))] w-full"><span
              class="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
              aria-hidden="true"></span>Login</button><button type="button"
            class="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 data-[disabled]:opacity-75 [&amp;>[data-slot=icon]]:-mx-0.5 [&amp;>[data-slot=icon]]:shrink-0 min-h-10 gap-x-3 px-4 py-2 sm:text-sm [&amp;>[data-slot=icon]]:size-5 [&amp;>[data-slot=icon]]:sm:size-4 border-[--btn-border] bg-[--btn-bg] text-[--btn-text] hover:bg-[--btn-hover] focus:outline-[--btn-text] [--btn-bg:transparent] [--btn-border:hsl(var(--primary)/15%)] [--btn-hover:hsl(var(--bg-overlay-hover))] [--btn-text:hsl(var(--primary))] w-full"><span
              class="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
              aria-hidden="true"></span>Go back</button></div>
      </form>
      <div class="text-center">
        <p class="text-sm text-muted">Don't have an account?<!-- --> <a class="text-primary hover:underline"
            href="/sign-up">Sign up</a></p>
      </div>
    </div>
  </div>
</template>

注意事项：1、我发现你写的密码、昵称的正则表达式验证规则的时间有问题，用户输入的时候不应该校验，否则会提示很多错误，因为用户没输入完，校验当然不会通过，我们应该在提交的时候才进行校验；
2、输入密码的时候，你加了影藏密码的功能，但是你好像没有把浏览器默认的影藏密码的功能禁用掉，这样会导致用户输入密码的时候，会显示两个影藏密码的icon；
3、“使用邮箱注册”，用户填写完验证码，跳转到填写昵称和密码的表单，到了这个表单点击“返回”，应该返回的是填写“邮箱”的表单；而不是填写“验证码”的表单；