import { type ReactNode, useEffect, useRef } from 'react';
import { ClerkProvider, Show, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Landing, Portal, ExpertProfile } from '@/pages/portal';
import { Route, Switch, Redirect, Link, useLocation, Router as WouterRouter } from 'wouter';
import '@/index.css';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: '#28633d', colorForeground: '#263b2d', colorMutedForeground: '#728276', colorDanger: '#b9463b',
    colorBackground: '#fffefa', colorInput: '#fbfcf8', colorInputForeground: '#263b2d', colorNeutral: '#d9e0d4',
    fontFamily: 'DM Sans', borderRadius: '0.8rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffefa] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#dfe6dc] shadow-sm',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#263b2d] font-bold', headerSubtitle: 'text-[#728276]', socialButtonsBlockButtonText: 'text-[#263b2d]',
    formFieldLabel: 'text-[#344b3a] font-semibold', footerActionLink: 'text-[#28633d] font-semibold', footerActionText: 'text-[#728276]',
    dividerText: 'text-[#728276]', identityPreviewEditButton: 'text-[#28633d]', formFieldSuccessText: 'text-[#28633d]',
    alertText: 'text-[#263b2d]', logoBox: 'rounded-xl', logoImage: 'rounded-lg', socialButtonsBlockButton: 'border-[#dfe6dc] bg-white',
    formButtonPrimary: 'bg-[#28633d] hover:bg-[#1f5131] text-white shadow-none', formFieldInput: 'border-[#d9e0d4] bg-[#fbfcf8] text-[#263b2d]',
    footerAction: 'border-0', dividerLine: 'bg-[#e5eae2]', alert: 'bg-[#f8f5e9] border-[#e9e1c8]',
    otpCodeFieldInput: 'border-[#d9e0d4]', formFieldRow: 'gap-2', main: 'gap-5',
  },
};

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/user-portal" /></Show><Show when="signed-out"><Landing /></Show></>;
}
function UserPortal() {
  return <><Show when="signed-in"><Portal /></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}
function SignedInExpertProfile() {
  return <><Show when="signed-in"><ExpertProfile /></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>;
}
function SignInPage() {
  return <div className="auth-wrap"><div className="auth-note"><Link href="/" className="brand"><span className="brand-mark">A</span> AgriConnect</Link><h1>Good advice grows here.</h1><p>Come back to your crop questions, bookings, and specialist conversations.</p></div><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}
function SignUpPage() {
  return <div className="auth-wrap"><div className="auth-note"><Link href="/" className="brand"><span className="brand-mark">A</span> AgriConnect</Link><h1>Grow with the right guidance.</h1><p>Create your account and connect with agricultural specialists who understand your work.</p></div><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}
function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const cache = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== id) cache.clear();
    previous.current = id;
  }), [addListener, cache]);
  return null;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to access your account' } }, signUp: { start: { title: 'Create your account', subtitle: 'Connect with practical expertise' } } }}
    routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><ClerkCacheInvalidator /><RoutedErrorBoundary><Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/user-portal" component={UserPortal} />
      <Route path="/dashboard" component={UserPortal} />
      <Route path="/experts/:id" component={SignedInExpertProfile} />
      <Route component={NotFound} />
    </Switch></RoutedErrorBoundary><Toaster /></QueryClientProvider>
  </ClerkProvider>;
}
function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <TooltipProvider><WouterRouter base={basePath}><ClerkRoutes /></WouterRouter></TooltipProvider>;
}
export default App;
