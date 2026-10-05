import { getAuth } from "@clerk/express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  CreateBookingBody,
  CreateBookingMessageBody,
  CreateBookingMessageParams,
  CreateBookingMessageResponse,
  CreateBookingResponse,
  CreateProblemBody,
  CreateProblemResponse,
  GetDashboardSummaryResponse,
  GetExpertParams,
  GetExpertResponse,
  GetMyProfileResponse,
  ListBookingMessagesParams,
  ListBookingMessagesResponse,
  ListExpertsQueryParams,
  ListExpertsResponse,
  ListMyBookingsResponse,
  ListMyProblemsResponse,
  SaveMyProfileBody,
  SaveMyProfileResponse,
} from "@workspace/api-zod";
import {
  bookingsTable,
  db,
  messagesTable,
  problemsTable,
  usersTable,
} from "@workspace/db";

const router: IRouter = Router();
const farmerUsers = alias(usersTable, "booking_farmers");
const expertUsers = alias(usersTable, "booking_experts");
const messageSenders = alias(usersTable, "message_senders");

const sampleExperts = [
  {
    id: "demo-expert-rahul",
    name: "Dr. Rahul Kumar",
    email: "rahul.kumar@agriconnect.demo",
    role: "expert",
    location: "Ludhiana, Punjab",
    expertise: "Plant Pathology",
    experienceYears: 8,
    consultationPrice: 300,
    availableTime: "Monday–Friday, 5 PM–8 PM",
    rating: 4.7,
  },
  {
    id: "demo-expert-meera",
    name: "Dr. Meera Patel",
    email: "meera.patel@agriconnect.demo",
    role: "expert",
    location: "Anand, Gujarat",
    expertise: "Agronomy",
    experienceYears: 10,
    consultationPrice: 350,
    availableTime: "Monday–Saturday, 9 AM–1 PM",
    rating: 4.9,
  },
  {
    id: "demo-expert-arjun",
    name: "Dr. Arjun Singh",
    email: "arjun.singh@agriconnect.demo",
    role: "expert",
    location: "Jaipur, Rajasthan",
    expertise: "Entomology",
    experienceYears: 7,
    consultationPrice: 250,
    availableTime: "Tuesday–Saturday, 4 PM–7 PM",
    rating: 4.8,
  },
  {
    id: "demo-expert-ananya",
    name: "Dr. Ananya Rao",
    email: "ananya.rao@agriconnect.demo",
    role: "expert",
    location: "Bengaluru, Karnataka",
    expertise: "Horticulture",
    experienceYears: 9,
    consultationPrice: 400,
    availableTime: "Monday–Friday, 10 AM–2 PM",
    rating: 4.9,
  },
  {
    id: "demo-expert-vikram",
    name: "Dr. Vikram Nair",
    email: "vikram.nair@agriconnect.demo",
    role: "expert",
    location: "Coimbatore, Tamil Nadu",
    expertise: "Soil Science",
    experienceYears: 12,
    consultationPrice: 300,
    availableTime: "Monday–Friday, 3 PM–7 PM",
    rating: 4.8,
  },
  {
    id: "demo-expert-priya",
    name: "Dr. Priya Das",
    email: "priya.das@agriconnect.demo",
    role: "expert",
    location: "Kolkata, West Bengal",
    expertise: "Agricultural Engineering",
    experienceYears: 6,
    consultationPrice: 275,
    availableTime: "Wednesday–Sunday, 11 AM–4 PM",
    rating: 4.6,
  },
  {
    id: "demo-expert-suresh",
    name: "Dr. Suresh Yadav",
    email: "suresh.yadav@agriconnect.demo",
    role: "expert",
    location: "Hisar, Haryana",
    expertise: "Dairy",
    experienceYears: 11,
    consultationPrice: 300,
    availableTime: "Monday–Saturday, 7 AM–11 AM",
    rating: 4.8,
  },
  {
    id: "demo-expert-kavita",
    name: "Dr. Kavita Sharma",
    email: "kavita.sharma@agriconnect.demo",
    role: "expert",
    location: "Bhopal, Madhya Pradesh",
    expertise: "Poultry",
    experienceYears: 8,
    consultationPrice: 250,
    availableTime: "Monday–Friday, 2 PM–6 PM",
    rating: 4.7,
  },
  {
    id: "demo-expert-farhan",
    name: "Dr. Farhan Ali",
    email: "farhan.ali@agriconnect.demo",
    role: "expert",
    location: "Kochi, Kerala",
    expertise: "Fisheries",
    experienceYears: 9,
    consultationPrice: 325,
    availableTime: "Tuesday–Saturday, 9 AM–1 PM",
    rating: 4.9,
  },
];

let sampleDataPromise: Promise<void> | undefined;

async function ensureSampleExperts(): Promise<void> {
  sampleDataPromise ??= db
    .insert(usersTable)
    .values(sampleExperts)
    .onConflictDoNothing({ target: usersTable.id })
    .then(() => undefined);
  await sampleDataPromise;
}

function currentUserId(req: Request): string | undefined {
  return getAuth(req).userId ?? undefined;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!currentUserId(req)) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  next();
}

function profileResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    location: user.location,
    expertise: user.expertise,
    experienceYears: user.experienceYears,
    consultationPrice: user.consultationPrice,
    availableTime: user.availableTime,
  };
}

function expertResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    expertise: user.expertise ?? "General Agriculture",
    experienceYears: user.experienceYears ?? 0,
    rating: user.rating,
    consultationPrice: user.consultationPrice ?? 300,
    availableTime: user.availableTime ?? "Contact for available times",
    location: user.location,
  };
}

function bookingResponse(
  booking: typeof bookingsTable.$inferSelect,
  farmerName: string,
  expertName: string,
) {
  return {
    id: booking.id,
    farmerId: booking.farmerId,
    farmerName,
    expertId: booking.expertId,
    expertName,
    problemId: booking.problemId,
    date: booking.scheduledDate,
    time: booking.scheduledTime,
    price: booking.price,
    status: booking.status,
  };
}

router.get("/experts", async (req, res): Promise<void> => {
  await ensureSampleExperts();
  const query = ListExpertsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const filters = [eq(usersTable.role, "expert")];
  if (query.data.expertise) {
    filters.push(eq(usersTable.expertise, query.data.expertise));
  }
  const experts = await db
    .select()
    .from(usersTable)
    .where(and(...filters))
    .orderBy(desc(usersTable.rating), asc(usersTable.name));
  res.json(ListExpertsResponse.parse(experts.map(expertResponse)));
});

router.get("/experts/:id", async (req, res): Promise<void> => {
  const params = GetExpertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureSampleExperts();
  const [expert] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, params.data.id), eq(usersTable.role, "expert")));
  if (!expert) {
    res.status(404).json({ error: "Expert not found." });
    return;
  }
  res.json(GetExpertResponse.parse(expertResponse(expert)));
});

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const userId = currentUserId(req)!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "Complete your profile to continue." });
    return;
  }
  res.json(GetMyProfileResponse.parse(profileResponse(user)));
});

router.put("/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = SaveMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = currentUserId(req)!;
  const [user] = await db
    .insert(usersTable)
    .values({ id: userId, ...parsed.data })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: parsed.data,
    })
    .returning();
  res.json(SaveMyProfileResponse.parse(profileResponse(user)));
});

router.post("/problems", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const farmerId = currentUserId(req)!;
  const [farmer] = await db.select().from(usersTable).where(eq(usersTable.id, farmerId));
  if (!farmer || farmer.role !== "farmer") {
    res.status(403).json({ error: "Only farmer accounts can submit a problem." });
    return;
  }
  const [problem] = await db
    .insert(problemsTable)
    .values({ farmerId, ...parsed.data })
    .returning();
  res.status(201).json(
    CreateProblemResponse.parse({
      ...problem,
      createdAt: problem.createdAt.toISOString(),
    }),
  );
});

router.get("/problems", requireAuth, async (req, res): Promise<void> => {
  const userId = currentUserId(req)!;
  const problems = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.farmerId, userId))
    .orderBy(desc(problemsTable.createdAt));
  res.json(
    ListMyProblemsResponse.parse(
      problems.map((problem) => ({
        ...problem,
        createdAt: problem.createdAt.toISOString(),
      })),
    ),
  );
});

router.get("/bookings", requireAuth, async (req, res): Promise<void> => {
  const userId = currentUserId(req)!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const bookingFilter =
    user?.role === "expert"
      ? eq(bookingsTable.expertId, userId)
      : eq(bookingsTable.farmerId, userId);
  const bookings = await db
    .select({
      booking: bookingsTable,
      farmerName: farmerUsers.name,
      expertName: expertUsers.name,
    })
    .from(bookingsTable)
    .innerJoin(farmerUsers, eq(bookingsTable.farmerId, farmerUsers.id))
    .innerJoin(expertUsers, eq(bookingsTable.expertId, expertUsers.id))
    .where(bookingFilter)
    .orderBy(desc(bookingsTable.scheduledDate), asc(bookingsTable.scheduledTime));
  res.json(
    ListMyBookingsResponse.parse(
      bookings.map(({ booking, farmerName, expertName }) =>
        bookingResponse(booking, farmerName, expertName),
      ),
    ),
  );
});

router.post("/bookings", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const farmerId = currentUserId(req)!;
  const [farmer] = await db.select().from(usersTable).where(eq(usersTable.id, farmerId));
  if (!farmer || farmer.role !== "farmer") {
    res.status(403).json({ error: "Only farmer accounts can book a consultation." });
    return;
  }
  const [expert] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, parsed.data.expertId), eq(usersTable.role, "expert")));
  if (!expert) {
    res.status(404).json({ error: "Expert not found." });
    return;
  }
  const [booking] = await db
    .insert(bookingsTable)
    .values({
      farmerId,
      expertId: expert.id,
      problemId: parsed.data.problemId,
      scheduledDate: parsed.data.date,
      scheduledTime: parsed.data.time,
      price: expert.consultationPrice ?? 300,
    })
    .returning();
  res.status(201).json(
    CreateBookingResponse.parse(
      bookingResponse(booking, farmer.name, expert.name),
    ),
  );
});

router.get(
  "/bookings/:bookingId/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListBookingMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = currentUserId(req)!;
    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, params.data.bookingId));
    if (!booking) {
      res.status(404).json({ error: "Booking not found." });
      return;
    }
    if (booking.farmerId !== userId && booking.expertId !== userId) {
      res.status(403).json({ error: "You do not have access to this conversation." });
      return;
    }
    const messages = await db
      .select({
        message: messagesTable,
        senderName: messageSenders.name,
      })
      .from(messagesTable)
      .innerJoin(messageSenders, eq(messagesTable.senderId, messageSenders.id))
      .where(eq(messagesTable.bookingId, booking.id))
      .orderBy(asc(messagesTable.createdAt));
    res.json(
      ListBookingMessagesResponse.parse(
        messages.map(({ message, senderName }) => ({
          id: message.id,
          bookingId: message.bookingId,
          senderId: message.senderId,
          senderName,
          text: message.text,
          createdAt: message.createdAt.toISOString(),
        })),
      ),
    );
  },
);

router.post(
  "/bookings/:bookingId/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateBookingMessageParams.safeParse(req.params);
    const parsed = CreateBookingMessageBody.safeParse(req.body);
    if (!params.success || !parsed.success || !parsed.data.text.trim()) {
      res.status(400).json({ error: "Enter a message before sending." });
      return;
    }
    const userId = currentUserId(req)!;
    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, params.data.bookingId));
    if (!booking) {
      res.status(404).json({ error: "Booking not found." });
      return;
    }
    if (booking.farmerId !== userId && booking.expertId !== userId) {
      res.status(403).json({ error: "You do not have access to this conversation." });
      return;
    }
    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!sender) {
      res.status(404).json({ error: "Set up your profile before messaging." });
      return;
    }
    const [message] = await db
      .insert(messagesTable)
      .values({
        bookingId: booking.id,
        senderId: userId,
        text: parsed.data.text.trim(),
      })
      .returning();
    res.status(201).json(
      CreateBookingMessageResponse.parse({
        id: message.id,
        bookingId: message.bookingId,
        senderId: message.senderId,
        senderName: sender.name,
        text: message.text,
        createdAt: message.createdAt.toISOString(),
      }),
    );
  },
);

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = currentUserId(req)!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const isExpert = user?.role === "expert";
  const userBookings = await db
    .select()
    .from(bookingsTable)
    .where(
      isExpert
        ? eq(bookingsTable.expertId, userId)
        : eq(bookingsTable.farmerId, userId),
    );
  const userProblems = isExpert
    ? []
    : await db
        .select()
        .from(problemsTable)
        .where(eq(problemsTable.farmerId, userId));
  const bookingIds = userBookings.map((booking) => booking.id);
  const messageRows =
    bookingIds.length > 0
      ? await db
          .select({ id: messagesTable.id })
          .from(messagesTable)
          .where(inArray(messagesTable.bookingId, bookingIds))
      : [];
  const today = new Date().toISOString().slice(0, 10);
  const summary = {
    problemsCount: userProblems.length,
    bookingsCount: userBookings.length,
    messagesCount: messageRows.length,
    upcomingBookingsCount: userBookings.filter(
      (booking) => booking.scheduledDate >= today,
    ).length,
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
