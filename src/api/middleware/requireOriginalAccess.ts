import { Context, Next } from 'hono';
import { userHasAccessToOriginal } from '../auth/authorization';

/**
 * Middleware to require access to a specific original
 * Extracts originalId from route parameter and userId from auth context
 * Returns 403 if user doesn't have access
 */
export async function requireOriginalAccess(c: Context, next: Next) {
  // Get userId from context (assumes it's set by auth middleware)
  const userId = c.get('userId') as string | undefined;
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get originalId from route parameter
  // Can be named: :originalId, :original_id, or :originalSlug
  const originalIdParam =
    c.req.param('originalId') ||
    c.req.param('original_id') ||
    c.req.param('originalSlug');

  if (!originalIdParam) {
    return c.json({ error: 'Original ID not provided' }, 400);
  }

  // Try to parse as number (for ID-based routes)
  const originalId = parseInt(originalIdParam, 10);
  if (isNaN(originalId)) {
    return c.json({ error: 'Invalid original ID' }, 400);
  }

  // Check if user has access
  const hasAccess = await userHasAccessToOriginal(userId, originalId);

  if (!hasAccess) {
    return c.json(
      { error: 'Access denied to this original' },
      403
    );
  }

  // Continue to next handler
  await next();
}

/**
 * Middleware factory for requiring access to a specific original
 * Usage: app.use('/originals/:id/*', requireOriginalAccessFactory('id'))
 */
export function requireOriginalAccessFactory(paramName: string) {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId') as string | undefined;
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const originalIdParam = c.req.param(paramName);
    if (!originalIdParam) {
      return c.json({ error: 'Original ID not provided' }, 400);
    }

    const originalId = parseInt(originalIdParam, 10);
    if (isNaN(originalId)) {
      return c.json({ error: 'Invalid original ID' }, 400);
    }

    const hasAccess = await userHasAccessToOriginal(userId, originalId);
    if (!hasAccess) {
      return c.json(
        { error: 'Access denied to this original' },
        403
      );
    }

    await next();
  };
}
