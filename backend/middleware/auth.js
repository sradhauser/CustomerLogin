import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

const auth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  try {
    const decoded = jwt.verify(token, SECRET);
    
    // decoded.id will correspond to 'gustcust_id' (Primary Key)
    // decoded.loginId will correspond to 'id' (CPTT000000)
    if (!decoded.id) return res.status(401).json({ error: "Invalid token payload" });

    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export default auth;