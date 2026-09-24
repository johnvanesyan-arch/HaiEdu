# Admin account archive and deletion

The platform admin console shows current accounts by default. Its Archived tab contains archived accounts of every role, including school administrators and teachers.

1. Suspend an active account to block sign-in.
2. Archive a suspended account to remove it from the current list. The account and its institutional and academic history remain intact.
3. Restore an archived account to the current list in the suspended state. A separate activation action is required to allow sign-in.
4. For an archived student, create a deletion request, approve it, then use the separate final erasure action after typing `DELETE`. Rejecting the request returns the account to the archive.
5. For an archived staff, admin, school admin, content admin, or reserved parent account, the final delete action requires typing `DELETE`. It refuses to remove any account with references that would cascade academic data or violate ownership constraints. Transfer or resolve those linked records first.

The acting platform admin cannot archive or delete their own account. The last active platform admin cannot be suspended. Archive, restore, and deletion actions are recorded in the security audit log without storing email or classroom content in the final deletion event.

No bulk deletion is performed by this feature. Archive only changes the status of the selected account.
