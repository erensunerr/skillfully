# Skillfully

Skillfully is a workspace for authoring, sharing, publishing, installing, and improving agent skills.

## Language

**Skill**:
A reusable set of instructions and supporting files that an agent can install and run.

**Author**:
A person or authorized agent that can change a skill's draft.
_Avoid_: Maintainer, collaborator

**Connected Agent**:
An agent authenticated to act through a Skillfully account.
_Avoid_: Separate agent user, anonymous bot

**Skill Owner**:
The account that controls a skill and whose access cannot be revoked by other authors.
_Avoid_: Original author, administrator

**Private Skill**:
A skill that is not listed publicly and is only available to explicitly authorized accounts.
_Avoid_: Unpublished skill, hidden public skill

**Private Release**:
A frozen release of a private skill that authorized users and their agents can use without public publication.
_Avoid_: Shared draft, private publish

**Skill Release**:
A frozen released state of a skill whose audience is determined by the skill's visibility and access grants.
_Avoid_: Separate public publish, separate private publish

**Use Access**:
Permission for an account and its connected agents to install and run a private release.
_Avoid_: View access, read-only edit access

**Edit Access**:
Permission for an account and its connected agents to change a skill's draft, publish private releases, use private releases, and manage non-owner sharing permissions.
_Avoid_: Write access, admin access

**Skill Version**:
An ordinal release number that increments by one each time authors publish the skill.
_Avoid_: Semantic version, semver

**Skill Invite**:
An email notification that points a person to a skill whose access has already been granted to that email address.
_Avoid_: Access request, pending approval

**Invite Delivery Failure**:
A failed notification attempt that does not change the already-granted skill access.
_Avoid_: Failed share, rejected invite

**Access Revocation**:
Removal of permission that stops Skillfully from serving current or future skill files to that account.
_Avoid_: Local uninstall, copy deletion

**Share List**:
The set of accounts explicitly granted use or edit access to a skill.
_Avoid_: Public audience, subscriber list

**Install Surface**:
The place where accounts and agents retrieve skill releases from Skillfully.
_Avoid_: Public-only endpoint, private-only endpoint

**Skill Identifier**:
The canonical skill id used for Skillfully API mutations.
_Avoid_: Display name, slug, title

**Shared Dashboard Skill**:
A skill shown in the dashboard because the signed-in account has use or edit access but is not necessarily the owner.
_Avoid_: Imported skill, public listing

## Relationships

- A **Skill** can have many **Authors**.
- A **Skill** has exactly one **Skill Owner**.
- A **Private Skill** can have many authorized accounts.
- A **Private Release** is a **Skill Release** served only to authorized accounts.
- The **Install Surface** serves public releases anonymously.
- The **Install Surface** serves **Private Releases** only to accounts with **Use Access** or **Edit Access**.
- **Use Access** applies to a **Private Release**.
- **Use Access** can exist before the first **Private Release**, but it serves no skill files until a release exists.
- **Edit Access** applies to a **Skill** draft.
- **Edit Access** includes **Use Access**.
- **Edit Access** can publish a new **Private Release**.
- **Edit Access** can grant or revoke **Use Access** and **Edit Access** for accounts other than the **Skill Owner**.
- A **Connected Agent** inherits its account's **Use Access** and **Edit Access**.
- A **Connected Agent** with **Edit Access** can manage the **Share List** for accounts other than the **Skill Owner**.
- A **Connected Agent** can resolve a human-provided skill name to a **Skill Identifier** before making a mutation.
- A **Shared Dashboard Skill** is marked as shared or externally owned.
- A **Shared Dashboard Skill** with **Use Access** exposes install and release access without editor, analytics, or settings surfaces.
- A **Shared Dashboard Skill** with **Use Access** does not expose the **Share List**.
- A **Shared Dashboard Skill** with **Edit Access** exposes editor, analytics, settings, publishing, and non-owner sharing surfaces.
- A **Skill Invite** notifies an account about existing **Use Access** or **Edit Access**.
- An **Invite Delivery Failure** does not revoke or roll back **Use Access** or **Edit Access**.
- Changing a **Skill** between public and private does not clear its **Share List**.
- **Access Revocation** stops Skillfully from serving current and future **Private Releases** to the revoked account.
- A **Skill Version** identifies exactly one **Skill Release**.

## Example Dialogue

> **Dev:** "If a teammate has **Use Access**, do they run the latest draft?"
> **Domain expert:** "No. **Use Access** gives them the current **Private Release**. They need **Edit Access** to change drafts."

## Flagged Ambiguities

- "Version" previously suggested semantic versioning; resolved: **Skill Version** is an integer release number.
- "Publish" can imply separate public and private actions; resolved: publishing creates one **Skill Release**, and access rules decide who can retrieve it.
- "Public" can sound like sharing no longer matters; resolved: public visibility does not erase the **Share List**.
- "Share" can mean both **Use Access** and **Edit Access**; resolved: private sharing must state the permission explicitly.
- "Invite" can imply a pending accept step; resolved: a **Skill Invite** is notification only, and access is effective once the email address is shared.
- "Email failed" can sound like sharing failed; resolved: **Invite Delivery Failure** only means the notification failed.
- "Edit" can be mistaken for draft-only access; resolved: **Edit Access** also includes **Use Access**.
- "Agent access" is not separate from account access; resolved: a **Connected Agent** acts through the authenticated account's permissions.
- "Skill name" is too ambiguous for mutation APIs; resolved: mutations use the **Skill Identifier** after any name lookup.
- "Shared dashboard access" does not always mean editing; resolved: **Use Access** shows the skill without editor, analytics, or settings.
- "Use access" can expose a shared skill without exposing collaborator emails; resolved: only **Edit Access** exposes the **Share List**.
- "Owner" is distinct from general authorship; resolved: the **Skill Owner** is the only account whose access cannot be revoked by editors.
- "Revoke" cannot imply deleting files already copied outside Skillfully; resolved: **Access Revocation** only stops future Skillfully serving.
- "Unauthorized private skill" should not reveal existence; resolved: the **Install Surface** treats inaccessible private skills as missing.
