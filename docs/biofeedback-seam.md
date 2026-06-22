# Biofeedback probe sessions — architecture seam

Not built in milestone one. This documents where the future "attach a probe to a
patient, present cards, measure the response" feature plugs in, so it lands
without re-architecting playback or storage.

## The seams that already exist

- **Master clock.** `src/hooks/usePlaybackClock.ts` is the single timer advancing
  cards. It becomes the session clock: every `Observation.t` is measured from
  session start, and the card on screen at each sample is known from the store's
  `activeIndex`. No second clock is introduced.
- **Domain entity.** `src/domain/session.ts` (`Session`) and
  `src/session/types.ts` (`HardwareDriver`, `Observation`, `SessionRecord`) are
  the typed shapes. A `SessionRecord` references a `Sequence` by id.
- **Data layer.** Sessions persist via a `SessionRepository` (same pattern as the
  existing repositories) into a new Dexie store (`sessions`), keyed by id, with
  `observations` as a compact time-series array. Backend-ready like the rest.
- **Pure render engine.** The renderer never needs to know a probe exists, and the
  driver never touches React — they communicate through an event/observation bus.

## What gets added later

1. A `HardwareDriver` implementation per device (Web Serial / Web Bluetooth / WebHID
   — all client-side, no backend forced), selected behind the `HardwareDriver`
   interface.
2. A worker for signal processing (filtering/smoothing) so the SVG render loop
   stays smooth on weak devices.
3. A `SessionRecorder` service: on play, subscribe to the driver, stamp each
   reading with the playback clock + active card id, append to the `SessionRecord`.
4. A session-review surface: correlate readings to cards (which card produced the
   strongest response) — charts + export.

Nothing above changes the existing `presentation engine ⟂ domain ⟂ data ⟂ drivers`
boundaries; it fills in the `drivers` and `session` corners.
