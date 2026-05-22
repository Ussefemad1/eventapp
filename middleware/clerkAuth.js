const { clerkClient, createClerkClient } = require("@clerk/clerk-sdk-node");

// Verifies the Clerk session token sent from the frontend
async function clerkAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const sessionToken = authHeader.split(" ")[1];

    // Verify with Clerk
    const client = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const payload = await client.verifyToken(sessionToken);

    // payload.sub is the Clerk user ID
    req.clerkUserId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid session token" });
  }
}

module.exports = clerkAuth;