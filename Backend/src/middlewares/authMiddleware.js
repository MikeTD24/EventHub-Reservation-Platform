import jwt from 'jsonwebtoken';

/**
 * Vérifie que la requête contient un JWT valide.
 */
export const authenticateToken = (req, res, next) => {
  const authorization = req.headers.authorization;

  // Le header doit avoir la forme : Authorization: Bearer <token>
  if (!authorization) {
    return res.status(401).json({
      message: 'Authentification requise.',
    });
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Format du token invalide.',
    });
  }

  try {
    // Vérifie la signature et la date d'expiration du JWT.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Rend l'identité disponible dans les contrôleurs suivants.
    req.user = payload;

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Le token a expiré.',
      });
    }

    return res.status(401).json({
      message: 'Token invalide.',
    });
  }
};

/**
 * Vérifie que l'utilisateur authentifié possède le rôle admin.
 * Ce middleware doit être placé après authenticateToken.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Authentification requise.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Accès réservé aux administrateurs.',
    });
  }

  return next();
};
