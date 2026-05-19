# Skillfully

Skillfully is a workspace for authoring, sharing, publishing, installing, and improving agent skills.

## Language

**Skill**:
A reusable set of instructions and supporting files that an agent can install and run.

**Author**:
A person or authorized agent that can change a skill's draft.
_Avoid_: Owner, maintainer, collaborator

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
Permission for an account and its connected agents to change a skill's draft.
_Avoid_: Write access, admin access

**Skill Version**:
An ordinal release number that increments by one each time authors publish the skill.
_Avoid_: Semantic version, semver

## Relationships

- A **Skill** can have many **Authors**.
- A **Private Skill** can have many authorized accounts.
- **Use Access** applies to a **Private Release**.
- **Edit Access** applies to a **Skill** draft.
- A **Skill Version** identifies exactly one released state of a **Skill**.

## Example Dialogue

> **Dev:** "If a teammate has **Use Access**, do they run the latest draft?"
> **Domain expert:** "No. **Use Access** gives them the current **Private Release**. They need **Edit Access** to change drafts."

## Flagged Ambiguities

- "Version" previously suggested semantic versioning; resolved: **Skill Version** is an integer release number.
- "Share" can mean both **Use Access** and **Edit Access**; resolved: private sharing must state the permission explicitly.
