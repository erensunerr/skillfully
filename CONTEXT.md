# Skillfully

Skillfully is a workspace for authoring, sharing, publishing, installing, and improving agent skills.

## Language

**Skill**:
A reusable set of instructions and supporting files that an agent can install and run.

**Author**:
A person or authorized agent that can change a skill's draft.
_Avoid_: Maintainer, collaborator

**Skill Owner**:
The account that controls a skill and whose access cannot be revoked by other authors.
_Avoid_: Original author, administrator

**Private Skill**:
A skill that is not listed publicly and is only available to explicitly authorized accounts.
_Avoid_: Unpublished skill, hidden public skill

**Private Release**:
A frozen release of a private skill that authorized users and their agents can use without public publication.
_Avoid_: Shared draft, private publish

**Use Access**:
Permission for an account and its connected agents to install and run a private release.
_Avoid_: View access, read-only edit access

**Edit Access**:
Permission for an account and its connected agents to change a skill's draft, use its private releases, and manage non-owner sharing permissions.
_Avoid_: Write access, admin access

**Skill Version**:
An ordinal release number that increments by one each time authors publish the skill.
_Avoid_: Semantic version, semver

**Skill Invite**:
An email notification that points a person to a skill whose access has already been granted to that email address.
_Avoid_: Access request, pending approval

## Relationships

- A **Skill** can have many **Authors**.
- A **Skill** has exactly one **Skill Owner**.
- A **Private Skill** can have many authorized accounts.
- **Use Access** applies to a **Private Release**.
- **Edit Access** applies to a **Skill** draft.
- **Edit Access** includes **Use Access**.
- **Edit Access** can grant or revoke **Use Access** and **Edit Access** for accounts other than the **Skill Owner**.
- A **Skill Invite** notifies an account about existing **Use Access** or **Edit Access**.
- A **Skill Version** identifies exactly one released state of a **Skill**.

## Example Dialogue

> **Dev:** "If a teammate has **Use Access**, do they run the latest draft?"
> **Domain expert:** "No. **Use Access** gives them the current **Private Release**. They need **Edit Access** to change drafts."

## Flagged Ambiguities

- "Version" previously suggested semantic versioning; resolved: **Skill Version** is an integer release number.
- "Share" can mean both **Use Access** and **Edit Access**; resolved: private sharing must state the permission explicitly.
- "Invite" can imply a pending accept step; resolved: a **Skill Invite** is notification only, and access is effective once the email address is shared.
- "Edit" can be mistaken for draft-only access; resolved: **Edit Access** also includes **Use Access**.
- "Owner" is distinct from general authorship; resolved: the **Skill Owner** is the only account whose access cannot be revoked by editors.
