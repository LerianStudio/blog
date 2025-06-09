import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MemoryStore from "memorystore";
import { fileStorage } from "./fileStorage";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are required");
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required for secure sessions");
}

export function getSession() {
  const sessionTtl = 24 * 60 * 60 * 1000; // 24 hours (shorter for serverless)
  const MemoryStoreSession = MemoryStore(session);
  
  const sessionStore = new MemoryStoreSession({
    checkPeriod: sessionTtl, // Prune expired entries every 24h
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
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
      callbackURL: `${process.env.AMPLIFY_APP_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Log OAuth success without sensitive data
        console.log("Google OAuth authentication successful for user ID:", profile.id);
        
        // Upsert user in file storage
        const user = await fileStorage.upsertUser({
          id: profile.id,
          email: profile.emails?.[0]?.value || null,
          firstName: profile.name?.givenName || null,
          lastName: profile.name?.familyName || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
        });

        console.log("User profile updated successfully");
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
    console.log("Redirect URI will be:", `${process.env.AMPLIFY_APP_URL || 'http://localhost:5000'}/api/auth/google/callback`);
    
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
        
        console.log("User authentication successful");
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