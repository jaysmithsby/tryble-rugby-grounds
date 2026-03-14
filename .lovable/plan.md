

## Simplify Pool Invite Dialog

### Changes to `src/components/pools/PoolInvite.tsx`

Rebuild the component to be a clean, compact popover-style dialog that doesn't cover the full mobile screen:

1. **DialogContent**: Add `max-w-sm` and `rounded-2xl` classes, reduce padding to match other platform modals
2. **Keep**: Heading, subheading, QR code, invite code with copy button, and a single "Share" button using native share (with clipboard fallback)
3. **Remove all**:
   - Invite Link section
   - WhatsApp, Telegram, X, Facebook buttons and their handler functions
   - `shareMessage` variable
   - `MessageCircle` import
   - The local `Label` component
   - The "Friends can join..." tip text
4. **Share button**: Use native share when available, fall back to copying the invite link to clipboard with a toast
5. **Layout**: QR code centered (smaller, ~140px), invite code row with copy icon inline, share button full-width at bottom

Single file change.

