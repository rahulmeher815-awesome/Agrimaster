import { useEffect, useState, type ReactNode } from 'react';
import '../portal.css';
import { Link, useLocation, useParams } from 'wouter';
import { useUser, useClerk } from '@clerk/react';
import {
  useCreateBooking, useCreateBookingMessage, useCreateProblem, useGetDashboardSummary,
  useGetExpert, useGetMyProfile, useListBookingMessages, useListExperts,
  useListMyBookings, useListMyProblems, useSaveMyProfile,
  getGetDashboardSummaryQueryKey, getGetMyProfileQueryKey, getListBookingMessagesQueryKey,
  getListMyBookingsQueryKey, getListMyProblemsQueryKey,
} from '@workspace/api-client-react';
import type { Booking, Expert, Problem, ProfileInput } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown,
  CircleHelp, ClipboardList, Clock3, Leaf, LogOut, MapPin, Menu, MessageCircle, Plus,
  Send, ShieldCheck, Sprout, Star, Stethoscope, UserRound, Wheat, X,
} from 'lucide-react';

const expertiseForCategory: Record<string, string> = {
  'Plant Disease': 'Plant Pathology',
  'Crop Management': 'Agronomy',
  'Pest Control': 'Entomology',
  Horticulture: 'Horticulture',
  'Soil & Nutrients': 'Soil Science',
  'Farm Machinery': 'Agricultural Engineering',
  Dairy: 'Dairy',
  Poultry: 'Poultry',
  Fisheries: 'Fisheries',
};
const categories = Object.keys(expertiseForCategory);
type View = 'overview' | 'ask' | 'experts' | 'bookings' | 'messages' | 'profile';
const navItems: { id: View; title: string; icon: typeof Wheat }[] = [
  { id: 'overview', title: 'Overview', icon: Sprout },
  { id: 'ask', title: 'My crop questions', icon: CircleHelp },
  { id: 'experts', title: 'Find a specialist', icon: Stethoscope },
  { id: 'bookings', title: 'Bookings', icon: CalendarDays },
  { id: 'messages', title: 'Messages', icon: MessageCircle },
  { id: 'profile', title: 'My profile', icon: UserRound },
];
const initials = (name?: string) => (name || 'Farmer').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
const formatDay = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
};
function timeOptionsFor(availability: string) {
  const fallback = ['10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM'];
  const times = availability.match(/\b\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/gi);
  if (!times || times.length < 2) return fallback;
  const toMinutes = (value: string) => {
    const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!match) return null;
    const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return hour * 60 + Number(match[2] || 0);
  };
  const start = toMinutes(times[0]);
  let end = toMinutes(times[1]);
  if (start === null || end === null) return fallback;
  if (end <= start) end += 24 * 60;
  const options: string[] = [];
  for (let minutes = start; minutes < end; minutes += 60) {
    const hour24 = Math.floor((minutes % (24 * 60)) / 60);
    const minute = minutes % 60;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    options.push(`${hour12}:${String(minute).padStart(2, '0')} ${period}`);
  }
  return options.length ? options : fallback;
}

export function Landing() {
  const [, setLocation] = useLocation();
  const startSignup = (role: 'farmer' | 'expert') => {
    window.localStorage.setItem('agriconnect-role', role);
    setLocation('/sign-up');
  };
  return <main className="landing-page">
    <header className="landing-nav">
      <a className="brand" href="#"><span className="brand-mark"><Sprout size={20} /></span><span>AgriConnect</span></a>
      <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#for-farmers">For farmers</a></nav>
       <div className="landing-actions"><button className="button button-quiet" onClick={() => setLocation('/sign-in')}>Sign in</button><button className="button button-primary" onClick={() => startSignup('farmer')}>Create account <ArrowRight size={16} /></button></div>
    </header>
    <section className="hero">
      <div className="hero-copy page-enter">
        <div className="eyebrow"><span className="eyebrow-dot" /> PRACTICAL ADVICE, ROOTED IN EXPERIENCE</div>
         <h1>AgriConnect<br /><em>Connect Farmers with the Right Agriculture Experts.</em></h1>
         <p>Describe your farming problem, find the right expert, and get agricultural guidance.</p>
         <div className="hero-cta"><button className="button button-primary button-large" onClick={() => startSignup('farmer')}>Ask an Expert <ArrowRight size={18} /></button><button className="text-link" onClick={() => startSignup('expert')}>Become an Expert <ArrowDownRight size={15} /></button><button className="hero-login-link" onClick={() => setLocation('/sign-in')}>Already have an account? Sign in</button></div>
        <div className="hero-proof"><div className="proof-avatars"><span>AR</span><span>MK</span><span>FK</span></div><p><strong>Specialists who know your fields.</strong><br />A thoughtful next step, not another search result.</p></div>
      </div>
      <div className="hero-art" aria-label="Illustration of a crop field and a growing plant">
        <div className="art-sun" /><div className="art-hill hill-back" /><div className="art-hill hill-front" />
        <div className="art-field-lines"><i /><i /><i /><i /><i /></div>
        <div className="art-stem"><b /><b /><b /><span /></div>
        <div className="art-note note-one"><span className="note-icon"><Leaf size={16} /></span><span><b>One clear next step</b><small>From a crop expert</small></span><CheckCircle2 size={17} /></div>
        <div className="art-note note-two"><span className="rating-star"><Star size={14} fill="currentColor" /></span><span><b>People, not algorithms</b><small>Specialists with field experience</small></span></div>
        <div className="art-label">FIELD NOTES <span>01 / 03</span></div>
      </div>
      <div className="hero-bottom"><span>BUILT FOR THE QUESTIONS THAT CAN'T WAIT</span><span>MAHARASHTRA · INDIA</span></div>
    </section>
    <section className="trust-strip" id="for-farmers"><div><span className="strip-index">01</span><span>Describe what you see</span></div><div><span className="strip-index">02</span><span>Meet the right specialist</span></div><div><span className="strip-index">03</span><span>Keep advice close at hand</span></div><p>Good farming is a thousand small decisions. Make the next one with someone in your corner.</p></section>
    <section className="how-section" id="how-it-works">
      <div className="section-kicker">A SIMPLE PATH FROM QUESTION TO ANSWER</div><div className="how-heading"><h2>From the field<br />to a real conversation.</h2><p>No confusing forms or endless scrolling. Just share the problem, find someone who knows it, and take it from there.</p></div>
       <div className="steps-row"><article><span>01 / SHARE</span><div className="step-mark"><ClipboardList /></div><h3>Describe your problem</h3><p>Choose a crop and describe the symptoms in your own words. Add your location so advice can fit your conditions.</p></article><article><span>02 / MATCH</span><div className="step-mark"><Stethoscope /></div><h3>Find the right expert</h3><p>Browse agricultural specialists matched to your question, with experience, availability, and consultation details up front.</p></article><article><span>03 / CONNECT</span><div className="step-mark"><MessageCircle /></div><h3>Connect with the expert</h3><p>Book a consultation slot, then return to the same place for your booking and follow-up messages.</p></article></div>
    </section>
     <section className="landing-cta"><div><span className="section-kicker">START WITH WHAT YOU KNOW</span><h2>One question is<br />a good place to begin.</h2><p>Describe your crop concern and let a specialist help you work out the next step.</p></div><button className="button button-light button-large" onClick={() => startSignup('farmer')}>Ask an Expert <ArrowRight size={17} /></button><div className="cta-leaves"><Sprout size={176} strokeWidth={.65} /></div></section>
    <footer className="landing-footer"><a className="brand" href="#"><span className="brand-mark"><Sprout size={20} /></span>AgriConnect</a><p>Better answers for the work that feeds us.</p><span>COLLEGE PROJECT PROTOTYPE · NO REAL PAYMENTS</span></footer>
  </main>;
}

export function Portal() {
  const [view, setView] = useState<View>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedExpertise, setSelectedExpertise] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [problemSuccess, setProblemSuccess] = useState(false);
  const profileQuery = useGetMyProfile();
  const summaryQuery = useGetDashboardSummary();
  const problemsQuery = useListMyProblems();
  const bookingsQuery = useListMyBookings();
  const expertsQuery = useListExperts(selectedExpertise ? { expertise: selectedExpertise } : undefined);
  const profileMutation = useSaveMyProfile();
  const problemMutation = useCreateProblem();
  const bookingMutation = useCreateBooking();
  const messageMutation = useCreateBookingMessage();
  const profile = profileQuery.data;
  const profileNeedsSetup =
    profileQuery.isError &&
    (profileQuery.error as { status?: number } | undefined)?.status === 404;
  const problems = problemsQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const experts = expertsQuery.data ?? [];
  const isExpert = profile?.role === 'expert';
  const visibleNavItems = isExpert
    ? navItems.filter((item) => ['overview', 'bookings', 'messages', 'profile'].includes(item.id))
    : navItems;
  const activeBooking = bookings.find((b) => b.id === selectedBookingId) || bookings[0];
  const activeBookingId = activeBooking?.id ?? 0;
  const messagesQuery = useListBookingMessages(activeBookingId, { query: { enabled: !!activeBooking, queryKey: getListBookingMessagesQueryKey(activeBookingId), refetchInterval: 5000 } });
  const summary = summaryQuery.data;
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const userName = profile?.name || user?.firstName || 'Farmer';
  useEffect(() => {
    if (profileNeedsSetup) setView('profile');
  }, [profileNeedsSetup]);
  const openView = (next: View) => { setView(next); setMobileNav(false); setBookingSuccess(false); setProblemSuccess(false); };
  const invalidateProblems = () => queryClient.invalidateQueries({ queryKey: getListMyProblemsQueryKey() });
  const invalidateBookings = () => queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });

  return <div className="app-shell">
    <aside className={`app-sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <Link href="/" className="brand sidebar-brand"><span className="brand-mark"><Sprout size={19} /></span><span>AgriConnect</span></Link>
       <div className="workspace-label">{isExpert ? 'YOUR EXPERT DESK' : 'YOUR FARM DESK'}</div>
       <div className="sidebar-nav">{visibleNavItems.map(({ id, title, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => openView(id)} data-testid={`nav-${id}`}><Icon size={18} strokeWidth={1.8} /><span>{isExpert && id === 'bookings' ? 'Booking requests' : title}</span>{id === 'messages' && <span className="nav-dot" />}</button>)}</div>
      <div className="sidebar-bottom"><div className="side-help"><span className="help-icon"><ShieldCheck size={18} /></span><div><b>Advice, with a human touch.</b><small>Talk to someone who knows.</small></div></div><button className="profile-chip" onClick={() => openView('profile')}><span className="avatar">{initials(userName)}</span><span className="profile-chip-text"><b>{userName}</b><small>{profile?.role === 'expert' ? 'Agricultural specialist' : 'Farmer account'}</small></span><ChevronDown size={15} /></button></div>
    </aside>
    <main className="portal-main">
       <header className="portal-topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>{isExpert ? 'My expert desk' : 'My farm desk'}</span><span>/</span><b>{visibleNavItems.find((n) => n.id === view)?.title || 'Overview'}</b></div><div className="top-actions"><span className="today-label">{new Date().toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}</span><button className="icon-button" aria-label="Sign out" onClick={() => signOut({ redirectUrl: '/' })}><LogOut size={17} /></button></div></header>
      <div className="portal-content page-enter">
         {view === 'overview' && <Overview name={userName} isExpert={isExpert} experts={experts.slice(0, 2)} problems={problems} bookings={bookings} summary={summary} error={summaryQuery.isError} loading={profileQuery.isLoading || problemsQuery.isLoading} onRetry={() => { summaryQuery.refetch(); problemsQuery.refetch(); bookingsQuery.refetch(); }} onGo={openView} onOpenExpert={(e) => { setSelectedExpert(e); setLocation(`/experts/${e.id}`); }} />}
         {view === 'ask' && <ProblemDesk problems={problems} loading={problemsQuery.isLoading} saving={problemMutation.isPending} success={problemSuccess} saveError={problemMutation.isError} error={problemsQuery.isError} onRetry={() => problemsQuery.refetch()} onSubmit={(data) => problemMutation.mutate({ data }, { onSuccess: () => { setProblemSuccess(true); invalidateProblems(); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } })} onBrowse={(expertise) => { setSelectedExpertise(expertise); openView('experts'); }} />}
        {view === 'experts' && <ExpertDesk experts={experts} loading={expertsQuery.isLoading} error={expertsQuery.isError} filter={selectedExpertise} onFilter={setSelectedExpertise} onRetry={() => expertsQuery.refetch()} onProfile={(e) => { setSelectedExpert(e); setLocation(`/experts/${e.id}`); }} onBook={(e) => { setSelectedExpert(e); setBookingSuccess(false); }} />}
         {view === 'bookings' && <BookingsDesk bookings={bookings} isExpert={isExpert} loading={bookingsQuery.isLoading} error={bookingsQuery.isError} onRetry={() => bookingsQuery.refetch()} onMessage={(id) => { setSelectedBookingId(id); openView('messages'); }} onFind={() => openView(isExpert ? 'profile' : 'experts')} />}
          {view === 'messages' && <MessagesDesk bookings={bookings} activeBooking={activeBooking} isExpert={isExpert} messages={messagesQuery.data || []} loading={messagesQuery.isLoading} error={messagesQuery.isError} mutation={messageMutation} userId={profile?.id || user?.id || ''} onSelect={setSelectedBookingId} onRetry={() => messagesQuery.refetch()} onGo={openView} />}
         {view === 'profile' && <ProfileDesk profile={profile} onboarding={profileNeedsSetup} loading={profileQuery.isLoading} error={profileQuery.isError && !profileNeedsSetup} saveError={profileMutation.isError} saving={profileMutation.isPending} onRetry={() => profileQuery.refetch()} onSave={(data) => profileMutation.mutate({ data }, { onSuccess: () => { window.localStorage.removeItem('agriconnect-role'); queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() }); } })} />}
      </div>
    </main>
    {selectedExpert && view === 'experts' && <BookingModal expert={selectedExpert} problems={problems} date={bookingDate} time={bookingTime} setDate={setBookingDate} setTime={setBookingTime} success={bookingSuccess} saving={bookingMutation.isPending} saveError={bookingMutation.isError} onClose={() => { setSelectedExpert(null); setBookingSuccess(false); }} onBook={(problemId) => bookingMutation.mutate({ data: { expertId: selectedExpert.id, problemId, date: bookingDate, time: bookingTime } }, { onSuccess: () => { setBookingSuccess(true); invalidateBookings(); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } })} />}
  </div>;
}

function Overview({ name, isExpert, experts, problems, bookings, summary, error, loading, onRetry, onGo, onOpenExpert }: {
  name: string; isExpert: boolean; experts: Expert[]; problems: Problem[]; bookings: Booking[]; summary?: { problemsCount: number; bookingsCount: number; messagesCount: number; upcomingBookingsCount: number };
  error: boolean; loading: boolean; onRetry: () => void; onGo: (v: View) => void; onOpenExpert: (e: Expert) => void;
}) {
  const upcoming = bookings.filter((b) => ['confirmed', 'upcoming', 'pending'].includes(b.status.toLowerCase())).slice(0, 2);
  const otherName = (booking: Booking) => isExpert ? booking.farmerName : booking.expertName;
  const cards = [
    { label: isExpert ? 'Your expertise' : 'Crop questions', count: isExpert ? 1 : summary?.problemsCount ?? problems.length, icon: isExpert ? Stethoscope : CircleHelp, note: isExpert ? 'Profile listed for farmers' : 'Shared with specialists', tone: 'sage' },
    { label: isExpert ? 'Booking requests' : 'Consultations', count: summary?.bookingsCount ?? bookings.length, icon: CalendarDays, note: `${summary?.upcomingBookingsCount ?? upcoming.length} coming up`, tone: 'ochre' },
    { label: 'Conversations', count: summary?.messagesCount || 0, icon: MessageCircle, note: 'In your farm desk', tone: 'blue' },
  ];
  return <section>
    <div className="welcome-row"><div><div className="section-kicker">{isExpert ? 'EXPERT DESK' : 'YOUR FARM DESK'}</div><h1>Good day, {name.split(' ')[0]}<span className="heading-period">.</span></h1><p>{isExpert ? 'Your profile and consultation requests are ready here.' : 'What can we help you work through today?'}</p></div><div className="season-badge"><Wheat size={16} /><span>{isExpert ? 'Expert profile' : 'Growing season'}<br /><b>{isExpert ? 'Guidance starts here' : 'Advice is close by'}</b></span></div></div>
    {error && <InlineError text="Some dashboard details couldn't be loaded." retry={onRetry} />}
    {loading ? <div className="metric-grid"><div className="skeleton metric-skeleton" /><div className="skeleton metric-skeleton" /><div className="skeleton metric-skeleton" /></div> : <div className="metric-grid">{cards.map(({ label, count, icon: Icon, note, tone }) => <div className="metric-card" key={label} data-testid={`metric-${label.toLowerCase().replace(' ', '-')}`}><div className={`metric-icon ${tone}`}><Icon size={18} /></div><div className="metric-count">{count}</div><div className="metric-label">{label}</div><div className="metric-note">{note}</div></div>)}</div>}
    <div className="dashboard-grid">
      <div className="dash-column"><div className="panel questions-panel"><div className="panel-heading"><div><span className="section-kicker">{isExpert ? 'YOUR PRACTICE' : 'START HERE'}</span><h2>{isExpert ? 'Be easy for farmers to find.' : "What's happening in your field?"}</h2></div><span className="round-illustration"><Leaf size={22} /></span></div><p>{isExpert ? 'Keep your area of expertise, consultation price, and available times up to date.' : "Describe a crop concern and we'll connect it with the right kind of expertise."}</p><button className="button button-primary" onClick={() => onGo(isExpert ? 'profile' : 'ask')}>{isExpert ? 'Edit expert profile' : 'Share a crop question'} <ArrowRight size={16} /></button></div>
        {!isExpert && <div className="panel"><div className="panel-title-row"><div><span className="section-kicker">A FEW GOOD PEOPLE</span><h2>Specialists to know</h2></div><button className="panel-link" onClick={() => onGo('experts')}>See all <ArrowRight size={15} /></button></div><div className="expert-mini-list">{experts.map((expert, i) => <ExpertMini key={expert.id} expert={expert} index={i} onClick={() => onOpenExpert(expert)} />)}{!experts.length && <EmptyMini title="No specialists loaded yet" copy="Try loading the specialist list." action="Find a specialist" onClick={() => onGo('experts')} />}</div></div>}
      </div>
      <div className="dash-column"><div className="panel booking-panel"><div className="panel-title-row"><div><span className="section-kicker">{isExpert ? 'BOOKING REQUESTS' : 'ON YOUR CALENDAR'}</span><h2>{isExpert ? 'Upcoming consultations' : 'Coming up'}</h2></div><button className="panel-link" onClick={() => onGo('bookings')}>{isExpert ? 'View requests' : 'All bookings'} <ArrowRight size={15} /></button></div>{upcoming.length ? upcoming.map((b) => <div className="upcoming-booking" key={b.id}><div className="date-tile"><b>{new Date(`${b.date}T12:00:00`).getDate() || '—'}</b><span>{new Date(`${b.date}T12:00:00`).toLocaleDateString('en', { month: 'short' })}</span></div><div className="upcoming-detail"><b>{otherName(b)}</b><small>Consultation · {b.time}</small></div><button className="tiny-arrow" onClick={() => onGo('messages')} aria-label="Open booking messages"><ArrowRight size={16} /></button></div>) : <EmptyMini title={isExpert ? 'No booking requests yet' : 'Nothing scheduled yet'} copy={isExpert ? 'Farmer consultations will appear here after a booking.' : 'Your confirmed consultations will show up here.'} action={isExpert ? 'Edit profile' : 'Find an expert'} onClick={() => onGo(isExpert ? 'profile' : 'experts')} />}</div>
        {!isExpert && <><div className="field-note"><div className="field-note-mark"><Leaf size={18} /></div><div><span>FIELD NOTE</span><p>Good advice starts with a clear picture. Share what changed, and when you first noticed it.</p></div></div>
        <div className="panel recent-panel"><div className="panel-title-row"><div><span className="section-kicker">RECENTLY SHARED</span><h2>Your crop questions</h2></div><button className="panel-link" onClick={() => onGo('ask')}>View all <ArrowRight size={15} /></button></div>{problems.slice(0, 2).map((p) => <div className="recent-problem" key={p.id}><span className="problem-leaf"><Leaf size={16} /></span><div><b>{p.crop} · {p.category}</b><small>{p.description}</small></div></div>)}{!problems.length && <EmptyMini title="Your crop questions will live here" copy="Share a question to get started." action="Ask a question" onClick={() => onGo('ask')} />}</div></>}
      </div>
    </div>
  </section>;
}

function ProblemDesk({ problems, loading, saving, success, saveError, error, onRetry, onSubmit, onBrowse }: {
  problems: Problem[]; loading: boolean; saving: boolean; success: boolean; saveError: boolean; error: boolean; onRetry: () => void;
  onSubmit: (data: { crop: string; category: string; description: string; location: string }) => void; onBrowse: (e: string) => void;
}) {
  const [crop, setCrop] = useState(''); const [category, setCategory] = useState(categories[0]); const [description, setDescription] = useState(''); const [location, setFarmLocation] = useState('');
  return <section><PageHeading kicker="CROP QUESTIONS" title="Let's take a closer look." subtitle="A few details help us connect your question to the right specialist." />
    {success && <div className="success-banner" data-testid="status-problem-submitted"><CheckCircle2 size={19} /><span><b>Your question is in.</b> We’ve added it to your crop questions. Take a look at specialists who can help.</span><button onClick={() => onBrowse(expertiseForCategory[category])}>See matched experts <ArrowRight size={15} /></button></div>}
    {saveError && <div className="inline-error" role="alert"><span>We couldn’t save your crop question. Check your connection and try again.</span></div>}
    <div className="form-layout"><div className="panel form-panel"><div className="form-intro"><span className="section-kicker">DESCRIBE THE SITUATION</span><h2>A little context goes a long way.</h2><p>Use your own words. Specific details are useful, even if you're not sure what they mean yet.</p></div><form onSubmit={(e) => { e.preventDefault(); onSubmit({ crop, category, description, location }); }}>
      <label>Crop or plant<input required value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="For example, tomato" data-testid="input-crop" /></label>
      <label>What kind of help do you need?<select value={category} onChange={(e) => setCategory(e.target.value)} data-testid="select-category">{categories.map((c) => <option key={c}>{c}</option>)}</select><small className="form-hint">This helps match you with the right specialist.</small></label>
      <label>What are you noticing?<textarea required rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you see, when it started, or what you've already tried…" data-testid="input-description" /></label>
      <label>Your farm location<input required value={location} onChange={(e) => setFarmLocation(e.target.value)} placeholder="Village or town, district" data-testid="input-location" /></label>
      <button className="button button-primary" disabled={saving}>{saving ? 'Sharing your question…' : 'Share crop question'}{!saving && <ArrowRight size={16} />}</button>
    </form></div><aside className="form-aside"><div className="aside-leaf"><Sprout size={32} /></div><span className="section-kicker">A HELPFUL TIP</span><h3>Start with what you can see.</h3><p>Leaf color, spots, soil conditions, recent weather, and when the change began can all help a specialist understand what's going on.</p><div className="tip-rule" /><small>Your question is only shared with specialists in the matching area.</small><ShieldCheck size={17} /></aside></div>
    <div className="below-list"><div className="panel-title-row"><div><span className="section-kicker">YOUR HISTORY</span><h2>Questions you've shared</h2></div></div>{error && <InlineError text="Couldn't load your crop questions." retry={onRetry} />}{loading ? <div className="skeleton list-skeleton" /> : problems.length ? <div className="problem-list">{problems.map((p) => <div className="problem-row" key={p.id}><span className="problem-leaf"><Leaf size={16} /></span><div className="problem-text"><b>{p.crop} <span>·</span> {p.category}</b><p>{p.description}</p></div><span className="soft-status">Shared</span><small>{formatDay(p.createdAt.slice(0, 10))}</small><button className="button button-outline small-button" onClick={() => onBrowse(expertiseForCategory[p.category] || p.category)}>Find an expert</button></div>)}</div> : <EmptyMini title="Your crop questions will live here" copy="Share a question above to get started." action="Ask a question" onClick={() => document.querySelector('input')?.focus()} />}</div>
  </section>;
}

function ExpertDesk({ experts, loading, error, filter, onFilter, onRetry, onProfile, onBook }: {
  experts: Expert[]; loading: boolean; error: boolean; filter: string; onFilter: (s: string) => void; onRetry: () => void; onProfile: (e: Expert) => void; onBook: (e: Expert) => void;
}) {
  const expertiseOptions = [...new Set(Object.values(expertiseForCategory))];
  return <section><PageHeading kicker="SPECIALISTS" title="People who know the field." subtitle="Find a specialist by the kind of problem you're working through." />
    <div className="filter-row"><div className="filter-label"><Stethoscope size={17} /> MATCH BY EXPERTISE</div><select value={filter} onChange={(e) => onFilter(e.target.value)} data-testid="select-expertise"><option value="">All specialties</option>{expertiseOptions.map((e) => <option key={e}>{e}</option>)}</select>{filter && <button className="text-link" onClick={() => onFilter('')}>Clear filter <X size={14} /></button>}<span className="filter-count">{experts.length} specialists</span></div>
    {error && <InlineError text="Specialists could not be loaded right now." retry={onRetry} />}
    {loading ? <div className="expert-grid">{[1, 2, 3].map((n) => <div className="skeleton expert-skeleton" key={n} />)}</div> : <div className="expert-grid">{experts.map((expert, i) => <ExpertCard key={expert.id} expert={expert} index={i} onProfile={() => onProfile(expert)} onBook={() => onBook(expert)} />)}</div>}
    {!loading && !experts.length && <EmptyState icon={<Stethoscope />} title="No specialists in this area yet" copy="Try another specialty to see who may be able to help." action="Show all specialists" onClick={() => onFilter('')} />}
  </section>;
}

export function ExpertProfile() {
  const params = useParams<{ id: string }>();
  const expertQuery = useGetExpert(params.id || '');
  const problemsQuery = useListMyProblems();
  const createBooking = useCreateBooking();
  const queryClient = useQueryClient();
  const expert = expertQuery.data;
  const [selected, setSelected] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  if (expertQuery.isLoading) return <div className="profile-route"><div className="skeleton profile-skeleton" /></div>;
  if (!expert) return <div className="profile-route"><Link href="/user-portal" className="back-link"><ArrowLeft size={16} /> Back to your farm desk</Link><InlineError text="This specialist profile could not be loaded." retry={() => expertQuery.refetch()} /></div>;
  return <div className="profile-route"><Link href="/user-portal" className="back-link"><ArrowLeft size={16} /> Back to your farm desk</Link>{<>
    <div className="expert-profile-hero"><div className="expert-avatar large-avatar">{initials(expert.name)}</div><div><span className="section-kicker">{expert.expertise.toUpperCase()}</span><h1>{expert.name}</h1><p><MapPin size={15} /> {expert.location}</p></div><div className="expert-rating"><Star size={16} fill="currentColor" /> {expert.rating.toFixed(1)} <span>specialist rating</span></div></div>
    <div className="profile-detail-grid"><div className="panel"><span className="section-kicker">ABOUT THIS SPECIALIST</span><h2>Practical guidance from field experience.</h2><p>{expert.name} works with growers on {expert.expertise.toLowerCase()} questions, sharing thoughtful, actionable advice grounded in agricultural practice.</p><div className="expert-facts"><span><b>{expert.experienceYears} years</b><small>of experience</small></span><span><b>{expert.expertise}</b><small>area of expertise</small></span><span><b>{expert.location}</b><small>based in</small></span></div></div><div className="panel booking-side"><span className="section-kicker">CONSULTATION DETAILS</span><h2>Plan a conversation.</h2><div className="detail-line"><Clock3 size={17} /><span><b>Available</b><small>{expert.availableTime}</small></span></div><div className="detail-line"><CalendarDays size={17} /><span><b>Consultation</b><small>Choose a slot when you book</small></span></div><div className="price-line"><span>Consultation price</span><b>₹{expert.consultationPrice}</b></div><button className="button button-primary full-button" onClick={() => { setSelected(true); setBookingSuccess(false); }}>Book a consultation <ArrowRight size={16} /></button><small className="demo-notice">Demo experience. No real payment is taken.</small></div></div>
  </>}{selected && <BookingModal expert={expert} problems={problemsQuery.data || []} date={bookingDate} time={bookingTime} setDate={setBookingDate} setTime={setBookingTime} success={bookingSuccess} saving={createBooking.isPending} saveError={createBooking.isError} onClose={() => setSelected(false)} onBook={(problemId) => createBooking.mutate({ data: { expertId: expert.id, problemId, date: bookingDate, time: bookingTime } }, { onSuccess: () => { setBookingSuccess(true); queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } })} />}</div>;
}

function BookingsDesk({ bookings, isExpert, loading, error, onRetry, onMessage, onFind }: {
  bookings: Booking[]; isExpert: boolean; loading: boolean; error: boolean; onRetry: () => void; onMessage: (id: number) => void; onFind: () => void;
}) {
  const otherName = (booking: Booking) => isExpert ? booking.farmerName : booking.expertName;
  return <section>
    <PageHeading kicker={isExpert ? 'BOOKING REQUESTS' : 'YOUR CONSULTATIONS'} title={isExpert ? 'Meet the farmers you can help.' : 'Bookings, all in one place.'} subtitle={isExpert ? 'See upcoming farmer consultations and continue each conversation.' : "See what's coming up and pick up the conversation with your specialist."} />
    <div className="panel bookings-panel">
      <div className="panel-title-row"><div><span className="section-kicker">{isExpert ? 'CONSULTATION REQUESTS' : 'BOOKING HISTORY'}</span><h2>Your consultations</h2></div>{!isExpert && <button className="button button-outline small-button" onClick={onFind}><Plus size={15} /> Find a specialist</button>}</div>
      {error && <InlineError text="We couldn't load your bookings." retry={onRetry} />}
      {loading ? <div className="skeleton list-skeleton" /> : bookings.length ? <div className="booking-list">{bookings.map((b) => <div className="booking-row" key={b.id}><div className="date-tile"><b>{new Date(`${b.date}T12:00:00`).getDate() || '—'}</b><span>{new Date(`${b.date}T12:00:00`).toLocaleDateString('en', { month: 'short' })}</span></div><div className="booking-row-main"><b>{otherName(b)}</b><small>{isExpert ? 'Farmer consultation' : 'Consultation with specialist'}</small></div><div className="booking-row-time"><b>{formatDay(b.date)}</b><small>{b.time}</small></div><span className={`status-pill ${b.status.toLowerCase()}`}>{b.status}</span><div className="booking-row-price">₹{b.price}</div><button className="button button-outline small-button" onClick={() => onMessage(b.id)}><MessageCircle size={15} /> Messages</button></div>)}</div> : <EmptyState icon={<CalendarDays />} title={isExpert ? 'No consultation requests yet' : "A conversation, when you're ready"} copy={isExpert ? 'Farmer bookings will appear here when someone books a consultation.' : 'Choose a specialist and book a consultation slot that works for you.'} action={isExpert ? 'Edit your profile' : 'Browse specialists'} onClick={onFind} />}
    </div>
  </section>;
}

function MessagesDesk({ bookings, activeBooking, isExpert, messages, loading, error, mutation, userId, onSelect, onRetry, onGo }: {
  bookings: Booking[]; activeBooking?: Booking; isExpert: boolean; messages: { id: number; bookingId: number; senderId: string; senderName: string; text: string; createdAt: string }[]; loading: boolean; error: boolean;
  mutation: ReturnType<typeof useCreateBookingMessage>; userId: string; onSelect: (id: number) => void; onRetry: () => void; onGo: (view: View) => void;
}) {
  const [text, setText] = useState('');
  const cache = useQueryClient();
  const bookingId = activeBooking?.id ?? 0;
  const otherName = (booking: Booking) => isExpert ? booking.farmerName : booking.expertName;
  return <section><PageHeading kicker="CONVERSATIONS" title="Keep the conversation going." subtitle="Messages stay alongside the consultation they belong to." /><div className="messages-layout"><aside className="panel conversation-list"><span className="section-kicker">YOUR CONSULTATIONS</span>{bookings.length ? bookings.map((b) => <button className={`conversation-choice ${b.id === activeBooking?.id ? 'selected' : ''}`} key={b.id} onClick={() => onSelect(b.id)}><span className="expert-avatar">{initials(otherName(b))}</span><span><b>{otherName(b)}</b><small>{formatDay(b.date)} · {b.time}</small></span><ArrowRight size={15} /></button>) : <p className="muted-copy">Your booking conversations will appear here.</p>}</aside>
   <div className="panel chat-panel">{activeBooking ? <><div className="chat-header"><div className="expert-avatar">{initials(otherName(activeBooking))}</div><div><b>{otherName(activeBooking)}</b><small>Consultation · {formatDay(activeBooking.date)}</small></div><span className="status-pill confirmed">{activeBooking.status}</span></div><div className="chat-messages">{error && <InlineError text="Messages couldn't be loaded." retry={onRetry} />}{loading ? <div className="skeleton chat-skeleton" /> : messages.length ? messages.map((m) => { const mine = m.senderId === userId; return <div key={m.id} className={`message-line ${mine ? 'mine' : ''}`}><span className="message-sender">{mine ? 'You' : m.senderName}</span><div className="message-bubble">{m.text}</div><small>{new Date(m.createdAt).toLocaleString('en', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small></div>; }) : <div className="chat-empty"><span className="round-illustration"><MessageCircle size={22} /></span><h3>Start with a hello.</h3><p>Your messages for this consultation will stay right here.</p></div>}</div>{mutation.isError && <div className="inline-error" role="alert"><span>Your message couldn’t be sent. Try again.</span></div>}<form className="message-composer" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; const toSend = text.trim(); mutation.mutate({ bookingId, data: { text: toSend } }, { onSuccess: () => { setText(''); cache.invalidateQueries({ queryKey: getListBookingMessagesQueryKey(bookingId) }); cache.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } }); }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" data-testid="input-message" /><button aria-label="Send message" disabled={!text.trim() || mutation.isPending} data-testid="button-send-message"><Send size={17} /></button></form></> : <EmptyState icon={<MessageCircle />} title="No conversation selected" copy={isExpert ? 'Your farmer conversations will appear here after someone books you.' : 'After booking a consultation, you can message your specialist here.'} action={isExpert ? 'Edit your profile' : 'Find a specialist'} onClick={() => onGo(isExpert ? 'profile' : 'experts')} />}</div></div></section>;
}

function ProfileDesk({ profile, onboarding, loading, error, saveError, saving, onRetry, onSave }: {
  profile?: { id: string; name: string; email: string; role: 'farmer' | 'expert'; location: string; expertise: string | null; experienceYears: number | null; consultationPrice: number | null; availableTime: string | null };
  onboarding: boolean; loading: boolean; error: boolean; saveError: boolean; saving: boolean; onRetry: () => void; onSave: (data: ProfileInput) => void;
}) {
  const { user } = useUser();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [location, setLocation] = useState('');
  const [role, setRole] = useState<'farmer' | 'expert'>('farmer'); const [expertise, setExpertise] = useState('Plant Pathology');
  const [years, setYears] = useState(''); const [price, setPrice] = useState(''); const [available, setAvailable] = useState('');
  useEffect(() => {
    if (profile) { setName(profile.name); setEmail(profile.email); setLocation(profile.location); setRole(profile.role); setExpertise(profile.expertise || 'Plant Pathology'); setYears(profile.experienceYears?.toString() || ''); setPrice(profile.consultationPrice?.toString() || ''); setAvailable(profile.availableTime || ''); }
    else if (user) { setName(user.fullName || ''); setEmail(user.primaryEmailAddress?.emailAddress || ''); setRole(window.localStorage.getItem('agriconnect-role') === 'expert' ? 'expert' : 'farmer'); }
  }, [profile, user]);
  return <section><PageHeading kicker={onboarding ? 'GET STARTED' : 'YOUR ACCOUNT'} title={onboarding ? 'Welcome to AgriConnect.' : 'A little about you.'} subtitle={onboarding ? 'Choose your role and add your details to set up your account.' : 'Keep your details up to date so advice and consultations fit your farm.'} />{onboarding && <div className="success-banner"><Sprout size={19} /><span><b>One quick setup step.</b> Choose whether you’re joining as a farmer or an agricultural specialist.</span></div>}{error && <InlineError text="Your profile could not be loaded." retry={onRetry} />}{saveError && <div className="inline-error" role="alert"><span>We couldn’t save your profile. Check the details and try again.</span></div>}{loading ? <div className="skeleton profile-skeleton" /> : <div className="panel profile-form-panel"><div className="profile-id-block"><span className="avatar avatar-large">{initials(profile?.name || name)}</span><div><span className="section-kicker">{onboarding ? 'CREATE YOUR PROFILE' : 'YOUR PROFILE'}</span><h2>{profile?.name || name || 'Your name'}</h2><small>{profile?.email || email}</small></div></div><form onSubmit={(e) => { e.preventDefault(); onSave({ name, email, role, location, expertise: role === 'expert' ? expertise : null, experienceYears: role === 'expert' ? Number(years) : null, consultationPrice: role === 'expert' ? Number(price) : null, availableTime: role === 'expert' ? available : null }); }} className="profile-form">
    <div className="form-two"><label>Full name<input required value={name} onChange={(e) => setName(e.target.value)} data-testid="input-profile-name" /></label><label>Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-profile-email" /></label></div>
    <div className="form-two"><label>Account type<select value={role} onChange={(e) => setRole(e.target.value as 'farmer' | 'expert')} data-testid="select-profile-role"><option value="farmer">Farmer</option><option value="expert">Agricultural specialist</option></select></label><label>Location<input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Village or town, district" data-testid="input-profile-location" /></label></div>
     {role === 'expert' && <><div className="form-two"><label>Area of expertise<select required value={expertise} onChange={(e) => setExpertise(e.target.value)}>{[...new Set(Object.values(expertiseForCategory))].map((x) => <option key={x}>{x}</option>)}</select></label><label>Years of experience<input required type="number" min="0" value={years} onChange={(e) => setYears(e.target.value)} /></label></div><div className="form-two"><label>Consultation price (₹)<input required type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></label><label>Available times<input required value={available} onChange={(e) => setAvailable(e.target.value)} placeholder="Weekdays, 9 AM–4 PM" /></label></div></>}
    <div className="profile-actions"><span>Your details are used to keep your AgriConnect account up to date.</span><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}{!saving && <Check size={16} />}</button></div>
  </form></div>}</section>;
}

function BookingModal({ expert, problems, date, time, setDate, setTime, success, saving, saveError, onClose, onBook }: {
  expert: Expert; problems: Problem[]; date: string; time: string; setDate: (d: string) => void; setTime: (t: string) => void; success: boolean; saving: boolean; saveError: boolean; onClose: () => void; onBook: (id: number | null) => void;
}) {
  const [problemId, setProblemId] = useState('');
  const timeOptions = timeOptionsFor(expert.availableTime);
  useEffect(() => {
    if (!timeOptions.includes(time)) setTime(timeOptions[0]);
  }, [expert.id, timeOptions.join('|'), time, setTime]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title"><button className="modal-close icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button>{success ? <div className="confirmation-view" data-testid="status-payment-success"><div className="confirmation-check"><Check size={28} /></div><span className="section-kicker">YOUR CONSULTATION IS BOOKED</span><h2 id="booking-title">Booking Confirmed</h2><p>Your booking with <b>{expert.name}</b> is confirmed for {formatDay(date)} at {time}. No real payment was taken.</p><div className="confirmed-slot"><CalendarDays size={18} /><span><b>{formatDay(date)}</b><small>{time} · ₹{expert.consultationPrice} demo consultation</small></span></div><div className="demo-payment"><ShieldCheck size={17} /><span><b>Payment Successful — Demo</b><small>No real payment was collected.</small></span></div><button className="button button-primary full-button" onClick={onClose}>Done <Check size={16} /></button></div> : <><div className="modal-expert"><span className="expert-avatar">{initials(expert.name)}</span><div><span className="section-kicker">BOOK A CONSULTATION</span><h2 id="booking-title">{expert.name}</h2><small>{expert.expertise} · ₹{expert.consultationPrice}</small></div></div><p className="modal-copy">Choose a day and one of this specialist’s available time slots.</p><form onSubmit={(e) => { e.preventDefault(); onBook(problemId ? Number(problemId) : null); }}><label>Choose a date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-booking-date" /></label><label>Available time<select value={time} onChange={(e) => setTime(e.target.value)} data-testid="select-booking-time">{timeOptions.map((t) => <option key={t}>{t}</option>)}</select></label><label>Link a crop question <select value={problemId} onChange={(e) => setProblemId(e.target.value)}><option value="">No specific question</option>{problems.map((p) => <option key={p.id} value={p.id}>{p.crop} · {p.category}</option>)}</select></label><div className="demo-payment"><ShieldCheck size={17} /><span><b>Demo booking</b><small>No real payment will be collected.</small></span><b>₹{expert.consultationPrice}</b></div>{saveError && <div className="inline-error" role="alert"><span>We couldn’t confirm the booking. Check the date and try again.</span></div>}<button className="button button-primary full-button" disabled={saving || !date}>{saving ? 'Confirming…' : 'Confirm booking'} <ArrowRight size={16} /></button></form></>}</div></div>;
}

function ExpertCard({ expert, index, onProfile, onBook }: { expert: Expert; index: number; onProfile: () => void; onBook: () => void }) {
  return <article className="expert-card"><div className="expert-card-top"><div className={`expert-avatar expert-avatar-${index % 3}`}>{initials(expert.name)}</div><div className="expert-rating"><Star size={14} fill="currentColor" /> {expert.rating.toFixed(1)}</div></div><span className="expert-specialty">{expert.expertise}</span><h3>{expert.name}</h3><p className="expert-location"><MapPin size={14} />{expert.location}</p><div className="expert-meta"><span><b>{expert.experienceYears}</b> years experience</span><span><b>₹{expert.consultationPrice}</b> / session</span></div><div className="expert-availability"><Clock3 size={14} />{expert.availableTime}</div><div className="expert-card-actions"><button className="button button-outline" onClick={onProfile}>View profile</button><button className="button button-primary" onClick={onBook}>Book a slot</button></div></article>;
}
function ExpertMini({ expert, index, onClick }: { expert: Expert; index: number; onClick: () => void }) {
  return <button className="expert-mini" onClick={onClick}><span className={`expert-avatar mini-avatar expert-avatar-${index % 3}`}>{initials(expert.name)}</span><span className="mini-name"><b>{expert.name}</b><small>{expert.expertise} · {expert.experienceYears} yrs</small></span><span className="mini-rating"><Star size={13} fill="currentColor" /> {expert.rating}</span><span className="mini-price">₹{expert.consultationPrice}</span><ArrowRight className="mini-chevron" size={15} /></button>;
}
function PageHeading({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return <div className="page-heading"><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{subtitle}</p></div>;
}
function InlineError({ text, retry }: { text: string; retry: () => void }) {
  return <div className="inline-error" role="alert"><span>{text}</span><button onClick={retry}>Try again <ArrowRight size={14} /></button></div>;
}
function EmptyState({ icon, title, copy, action, onClick }: { icon: ReactNode; title: string; copy: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{copy}</p><button className="button button-outline" onClick={onClick}>{action} <ArrowRight size={15} /></button></div>;
}
function EmptyMini({ title, copy, action, onClick }: { title: string; copy: string; action: string; onClick: () => void }) {
  return <div className="empty-mini"><div><b>{title}</b><p>{copy}</p></div><button className="panel-link" onClick={onClick}>{action} <ArrowRight size={14} /></button></div>;
}
