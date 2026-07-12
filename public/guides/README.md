# Movement Guide shorts

5–10s vertical (9:16) clips showing how each movement is done, one folder
per bodypart. The dashboard's Movement Guides panel resolves videos by
convention — drop files here and they play inline; missing files fall back
to the bronze placeholder card.

```
/guides/<bodypart>/<movement>.mp4   ← the short (muted, loops)
/guides/<bodypart>/<movement>.jpg   ← optional thumbnail
```

Folder and file names are lowercase, non-alphanumerics collapsed to `-`:

```
/guides/legs/back-squat.mp4
/guides/legs/romanian-deadlift.mp4
/guides/back/barbell-row.mp4
/guides/core/plank.mp4
/guides/chest/incline-db-press.mp4
```

The taxonomy lives in `src/lib/guides.ts` (`GUIDE_LIBRARY`); today's session
list (`TODAY_GUIDES`) will come from the coach's plan once that endpoint
exists.
