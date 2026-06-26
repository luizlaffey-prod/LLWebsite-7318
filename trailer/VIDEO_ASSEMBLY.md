# RESSONÂNCIAS DO AMANHÃ — Trailer Assembly Sheet (EDL)
### *Echoes of Tomorrow* · ~2:00 · 2.39:1 (clips render 1344×576, 21:9) · English

This sheet is everything needed to cut the finished trailer in any NLE (Premiere, Resolve, CapCut, or `ffmpeg`). **All assets are generated and hosted** — video clips on Higgsfield (Seedance 2.0, native ambient audio baked in), music/VO/SFX on the Angel/ElevenLabs gateway.

## ✅ Build status (CDN liberada)

The Higgsfield/CloudFront CDN is now reachable from this environment, so the **picture cut has been assembled and committed**: [`picture_cut.mp4`](./picture_cut.mp4).

- **What it is:** all 24 clips downloaded from the CDN and concatenated in story order (§2), 1470×630 (21:9), h264, ~121.7s (≈2:01). Carries each clip's native ambient audio (AAC 48 kHz stereo; silent audio padded onto the two title clips 23/24 which render mute).
- **How it was built:** clips fetched in order, audio normalized to a common AAC 48 kHz stereo track, then `ffmpeg -f concat -c copy`. See §1 for the recipe.
- **What's still missing — the music/VO/SFX mix.** The audio host `angel-replicate-media.angel-tools.io` (§3) is **still blocked by this environment's egress policy** (proxy returns 403). To finish the full mix here, that host needs to be allow-listed too; otherwise pull the audio from the links in §3 and lay it over `picture_cut.mp4` in any NLE per the timeline in §4.

> **Link expiry:** audio URLs (`angel-tools.io`) are signed for **30 days**. Video URLs (`cloudfront.net`) are your Higgsfield workspace assets — also viewable in the Higgsfield app under this workspace. Re-pull any expired link from its source.

---

## 1) How to assemble

**Fast path (ffmpeg):** download the 24 clips in order as `01.mp4 … 24.mp4`, then:
```
# concat clips (they already carry ambient audio)
ffmpeg -f concat -safe 0 -i list.txt -c copy picture.mp4
# build the VO+SFX dialogue stem in your editor or with adelay/amix, then:
ffmpeg -i picture.mp4 -i score.mp3 -i dialogue_stem.mp3 \
  -filter_complex "[1:a]volume=0.5[m];[0:a]volume=0.6[amb];[amb][m][2:a]amix=inputs=3:duration=longest[a]" \
  -map 0:v -map "[a]" -c:v copy final.mp4
```
**NLE path (recommended for control):** lay the 24 clips on V1 in order (≈5s each). Put `score.mp3` on A1 (duck −12 dB under VO). Put each VO line on A2 at the timecode in §4. Put SFX on A3. Add the three text cards (§4: shots 6, 10, 13 lower-third; 23/24 full-frame) — the title/tagline clips already render the text, so you can use them as-is or replace with vector titles.

**Mix:** score −12 to −18 dB under dialogue; clip ambient −10 dB; VO at 0 dB lead. One beat of near-silence before the teacup reveal (shot 9) and before the scream/AUDIO-NOT-SENT (shot 13).

---

## 2) Video clips (Higgsfield · Seedance 2.0 · 21:9 · ~5s each, ambient audio included)

| Shot | Beat | Clip URL |
|---|---|---|
| 01 | Ursulina writing the diary | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_023933_58f2f6f9-c3e7-439d-8113-c8812b184287.mp4 |
| 02 | The voiceless messenger | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_023219_0babbde8-445c-4401-88a6-ed9d62435961.mp4 |
| 03 | Sending dreams (lab) | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_023938_3c12bede-6642-4ade-aa2c-5018b058aadd.mp4 |
| 04 | Cafeteria banter | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_023225_db61a925-7f09-4bee-8c7c-c23857ad44f4.mp4 |
| 05 | Confiding in Antônia | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_024202_e7638d44-19ab-42dd-822e-f1bdefbfc42e.mp4 |
| 06 | "Not of God" + Card 1 | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_023229_22d64557-978b-4cdc-a784-675c7643059c.mp4 |
| 07 | Burying the teacup | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_023231_422e7f64-729f-4fe4-8d27-f76397476713.mp4 |
| 08 | Night excavation | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_023807_098f1961-fc72-4983-9f67-77074674872f.mp4 |
| 09 | The teacup revealed | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_023829_b21c43b2-68eb-4261-8f4f-f394769b1089.mp4 |
| 10 | The name on the cup + Card 2 | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_024208_9de99708-c51f-4673-b62c-1f6bbd491d97.mp4 |
| 11 | OmniWeb horror | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_024343_1a668576-08c6-4446-b1e4-650555a01aa6.mp4 |
| 12 | The emergency message | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_024508_7360e842-6674-4117-a93c-50bccbb27270.mp4 |
| 13 | AUDIO NOT SENT | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_024512_b2d9cae0-9e27-4a57-88c0-c2c59dab44b3.mp4 |
| 14 | Sebastiano's discovery | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_024515_0776d5c1-34ff-4f70-87f0-93b576020850.mp4 |
| 15 | Finding the diary | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_025140_03563abf-40bb-4a9a-921f-148bd6e42111.mp4 |
| 16 | The registry date | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_025143_53b0d5f4-b99f-4f93-9c61-bbef7e8b8c27.mp4 |
| 17 | The Inquisition | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_025146_e35a0649-f145-4e04-9cbd-e47b0444acda.mp4 |
| 18 | The accusation | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_025211_adb83e56-d3ef-462c-a73c-23791ab4589c.mp4 |
| 19 | The betrayal | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_025638_b6436ad3-98a0-4897-8321-fe2889c925bf.mp4 |
| 20 | The stake | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_030108_6977dac9-bc00-46f0-8873-85826f30a8fa.mp4 |
| 21 | The apology transmission | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_030111_321db300-1df2-4944-8269-d46e481c6d43.mp4 |
| 22 | The vision in the flames | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_030113_f46bbcbf-5c3f-49e7-be30-2838a3745d00.mp4 |
| 23 | Main title | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_030800_e500e159-9ea8-462e-82f6-c193f668a97f.mp4 |
| 24 | Tagline | https://d8j0ntlcm91z4.cloudfront.net/user_2zjmzLjFqwqOrZnBEfhFIe0matI/hf_20260626_030804_1eaa2424-6a57-47c5-b76d-4db90450f6af.mp4 |

---

## 3) Audio assets

**SCORE** (≈114s, evolving 5-act build) — lay from 0:00, loop/stretch tail as needed:
`https://angel-replicate-media.angel-tools.io/elevenlabs-music/1782441409477-bf3596990580e41b.mp3`

**SFX**
- Crowd jeer ("Burn, witch!") — `https://angel-replicate-media.angel-tools.io/elevenlabs-sfx/1782441391672-029190a749ed96f8.mp3`
- Transmission-fail shriek → silence — `https://angel-replicate-media.angel-tools.io/elevenlabs-sfx/1782441395042-37ed540066a4c02a.mp3`

**VOICEOVER / DIALOGUE** (ElevenLabs — Marcos=Brian, Ursulina=Lily, Vanessa=Sarah, Antônia=Bella, Sebastiano=Adam, System=Matilda, Inquisitor=George)
| VO | Char | Line | URL |
|---|---|---|---|
| 1 | Ursulina | "For three nights, I have dreamed of this man. I am terrified. My husband must never know." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441291637-39246d7b923b64f4.mp3 |
| 2 | Marcos | "We convert the image into a dream… and send it three hundred years into the past. The trouble is knowing if anyone ever receives it." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441293472-ecd85f067dd1625e.mp3 |
| 3 | Vanessa | "Whoever gets your message… might even fall in love with you." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441294631-c0df469461023f99.mp3 |
| 4 | Marcos | "This time-travel business… is complicated." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441296439-5140e81be20654bc.mp3 |
| 5 | Ursulina | "He says he is from the future. He wants me to bury something… so he can dig it up in his time." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441298020-bc761d33acb4ef2b.mp3 |
| 6 | Antônia | "That does not seem to be of God." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441299375-5bd75fa1527f3eb1.mp3 |
| 7 | Technician | "Contact. A small object." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441300589-483ab1db3d3a8206.mp3 |
| 8 | Marcos | "So it was you… Ursulina." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441301912-da2eae18ef8fe828.mp3 |
| 9 | Marcos | "It can't be. No. No, no, no." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441329262-f721cd23d6bcc3ce.mp3 |
| 10 | Marcos | "The dreams are not harmless. Change the directives. Stop… before it's too late." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441330819-f46cc03a47ca5a7b.mp3 |
| 11 | System | "Emergency message. Eighty-nine percent efficiency. Error. Audio not sent." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441332654-eccd6fccd97fc016.mp3 |
| 12 | Sebastiano | "You traitor. You think yourself better than me? You are confined to this room." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441334057-28b66fbac09b60c4.mp3 |
| 13 | Vanessa | "Chief… she wrote about you." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441335404-2234398e2643e46a.mp3 |
| 14 | Marcos | "What have we done." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441336734-384522bf0b8b1d26.mp3 |
| 15 | Inquisitor | "We bring a charge of witchcraft against this woman." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441338144-26d76d52362aaac5.mp3 |
| 16 | Sebastiano | "She has visions of messengers. Demons in angelic form. It is all in her diary." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441339620-cb0c7cac583e7aa1.mp3 |
| 17 | Antônia | "I witnessed her bury something… on a night of the full moon." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441367719-cc63309746f45168.mp3 |
| 18 | Inquisitor | "Ursulina de Jesus. You are sentenced to death by fire." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441369534-bb12c98fcb6555a4.mp3 |
| 19 | Marcos | "Thanks to your courage in answering us… please, accept our plea for forgiveness." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441371020-7bda372e30d8042d.mp3 |
| 20 | Ursulina | "Receive my soul… messenger." | https://angel-replicate-media.angel-tools.io/elevenlabs-tts/1782441372724-05f8c20c3a1cc9f7.mp3 |

---

## 4) Timeline (EDL)

| TC | Shot | Audio cue | On-screen text |
|---|---|---|---|
| 0:00 | 01 | VO1 (Ursulina) · score: solo cello in | — |
| 0:06 | 02 | clip ambient (eerie hum) · faint "Mar-cu-zi" | — |
| 0:14 | 03 | VO2 (Marcos) | — |
| 0:22 | 04 | VO3 (Vanessa) → VO4 (Marcos) | — |
| 0:30 | 05 | VO5 (Ursulina) | — |
| 0:38 | 06 | VO6 (Antônia) · score blooms | **CARD:** *In 2072, they learned to send dreams into the past.* |
| 0:44 | 07 | clip ambient (digging) · theme enters | — |
| 0:51 | 08 | VO7 (Technician) | — |
| 0:58 | 09 | one beat of silence, then cheer (clip) | — |
| 1:03 | 10 | VO8 (Marcos) | **CARD:** *They proved she existed.* |
| 1:08 | 11 | VO9 (Marcos) · dread rises | — |
| 1:15 | 12 | VO10 (Marcos) | — |
| 1:21 | 13 | VO11 (System) + SFX shriek → silence | **CARD (red):** *ERROR: AUDIO NOT SENT.* |
| 1:26 | 14 | VO12 (Sebastiano) · door slam | — |
| 1:32 | 15 | VO13 (Vanessa, whisper) | — |
| 1:38 | 16 | VO14 (Marcos) · low drone | — |
| 1:43 | 17 | VO15 (Inquisitor) · crowd murmur | — |
| 1:48 | 18 | VO16 (Sebastiano) | — |
| 1:51 | 19 | VO17 (Antônia) · single viola note | — |
| 1:54 | 20 | SFX crowd ("Burn, witch!") → VO18 (Inquisitor sentence) · war-drum | — |
| 1:57 | 21 | VO19 (Marcos, elegy) · theme resolves | — |
| 1:59 | 22 | VO20 (Ursulina) · fire dissolves to pure tone | — |
| 2:00 | 23 | score swell | **MAIN TITLE:** RESSONÂNCIAS DO AMANHÃ / *ECHOES OF TOMORROW* |
| 2:03 | 24 | single held tone, fade | **CARD:** *They reached across time. She paid for it.* |

---
*Clips: Higgsfield Seedance 2.0, 720p, native ambient audio. Audio: ElevenLabs via Angel AI Labs. Matches RESSONANCIAS_TRAILER_SCRIPT.md and STORYBOARD.md 1:1.*
