import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { fileStorage } from "./fileStorage";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are required");
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "fallback-secret-for-dev",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // Always secure since we're on HTTPS
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Google OAuth strategy
  const strategy = new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `https://${process.env.REPLIT_DOMAINS}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google OAuth profile received:", {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName
        });
        
        // Upsert user in file storage
        const user = await fileStorage.upsertUser({
          id: profile.id,
          email: profile.emails?.[0]?.value || null,
          firstName: profile.name?.givenName || null,
          lastName: profile.name?.familyName || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
        });

        console.log("User saved successfully:", user);
        return done(null, user);
      } catch (error) {
        console.error("OAuth strategy error:", error);
        return done(error, false);
      }
    }
  );

  passport.use(strategy);

  // Serialize/deserialize user for session
  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await fileStorage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error("User deserialization error:", error);
      done(null, false);
    }
  });

  // Auth routes
  app.get("/api/login", (req, res, next) => {
    console.log("=== STARTING GOOGLE OAUTH ===");
    console.log("Redirect URI will be:", `https://${process.env.REPLIT_DOMAINS}/api/auth/google/callback`);
    
    passport.authenticate("google", {
      scope: ["openid", "profile", "email"],
      accessType: "offline",
      prompt: "consent"
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    console.log("=== GOOGLE OAUTH CALLBACK ===");
    console.log("Query params:", req.query);
    console.log("Headers:", req.headers);
    
    if (req.query.error) {
      console.log("OAuth error from Google:", req.query.error);
      return res.redirect(`/admin/login?error=${req.query.error}`);
    }
    
    if (!req.query.code) {
      console.log("No authorization code received");
      return res.redirect("/admin/login?error=no_code");
    }
    
    passport.authenticate("google", (err: any, user: any, info: any) => {
      console.log("Passport authenticate result:", { 
        err: err?.message || err, 
        user: user ? `User ID: ${user.id}` : null, 
        info 
      });
      
      if (err) {
        console.error("Authentication error:", err);
        return res.redirect("/admin/login?error=auth_failed");
      }
      
      if (!user) {
        console.log("No user returned from authentication");
        return res.redirect("/admin/login?error=no_user");
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.redirect("/admin/login?error=login_failed");
        }
        
        console.log("Authentication successful! User logged in:", user.id);
        console.log("Session ID:", req.sessionID);
        res.redirect("/admin");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};