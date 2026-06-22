# Ingesting a doctor's save file into the library — architecture seam

Not built in milestone one. This documents how a future "take the cards from a
saved prescription and fold them into the card database" feature plugs in, so it
lands without re-architecting storage.

## The seams that already exist

- **Repository writes.** `RemedyRepository` already exposes every write the
  ingest needs: `addUserRemedy` (create/update a user card), `editRemedy` /
  `revertRemedy` (overlay an in-place fix onto a shipped card), and `setNotes`.
  Ingest is a composition of these calls — no new persistence primitive.
- **Self-describing prescriptions.** A saved file is a `Sequence` (validated by
  `SequenceSchema`), and share links carry the same plus the referenced styles
  (`SharePayload`). Each rate card holds its own `content.sequence` + `base`, so
  the rate travels with the card — nothing needs to be reconstructed.
- **Provenance.** Remedy cards keep their `content.ref` (`packId:id`). On import
  we can tell whether a card came from a shipped pack (→ propose an `editRemedy`
  overlay) or is bespoke (→ `addUserRemedy`).
- **Overlay model.** `remedyEdits` (in-place pack edits) and `remedyNotes` are
  ref-keyed overlays. A doctor's correction in a save file maps directly onto an
  `editRemedy(ref, patch)` — the same mechanism the editor UI already uses.

## What gets added later

1. An `ingestSequence(seq)` service that diffs each card against `getByRef`:
   - unchanged shipped card → skip;
   - shipped card with a changed rate/name → propose an `editRemedy` overlay;
   - bespoke (`data`) card → propose an `addUserRemedy`.
2. A review/merge UI (accept/reject per card; "apply all my fixes") so import is
   never silently destructive.
3. Conflict handling when two save files edit the same ref differently
   (last-write-wins by `updatedAt`, or surfaced for the doctor to choose).
4. When a backend arrives, the same `ingestSequence` runs against the remote
   `RemedyRepository` impl unchanged — sync becomes a server concern, not a
   rewrite here.

Nothing above changes the `engine ⟂ domain ⟂ data` boundaries; it adds a service
over the existing repository writes.
