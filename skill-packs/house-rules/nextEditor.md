# nextEditor house rules

Rules the video team follows on every film. Written from the client's feedback; see the house-rules skill
for the format. Seeded from the Naxified launch film that went wrong (2026-11-05).

## R-ED-001 Light is soft, never a hard polygon
- status: active
- applies: storyboard, animate, storyboard-check, critique
- rule: Every beam has core, body and halo layers with blur (about 0.4%, 1.5% and 4% of frame width) and fades along its length; no beam is a flat filled shape.
- why: v0 used flat white triangles where the reference has glowing beams.
- check: Across a beam edge, luma falls from 90% to 10% over at least 2% of frame width; measure.py glow ratio between 0.6 and 1.8.
- source: Naxified v0 review, 2026-11-05

## R-ED-002 The reference's look overrides skill defaults
- status: active
- applies: plan, storyboard, animate
- rule: Everything listed under "Allowed by reference" in style-spec.md is copied into the SPEC's ALLOWED line and overrides the hyperframes BANNED defaults (black stage, glow, centred text, serif italics).
- why: The BANNED list removed exactly the reference's look in v0.
- check: 02-plan/SPEC.md has an ALLOWED line that names every item of "Allowed by reference".
- source: Naxified v0 review, 2026-11-05

## R-ED-003 Titles sit in the light, inside title-safe
- status: active
- applies: storyboard, animate, storyboard-check, critique
- rule: Each title is centred on its light pool and stays inside the 80% title-safe box in every delivered format.
- why: v0 put titles at the wide end of the beam and cut one off at the frame edge.
- check: safe/*.png overlays show every title inside the red 80% box; no edge flag shows cut-off text.
- source: Naxified v0 review, 2026-11-05

## R-ED-004 First content no later than the reference's
- status: active
- applies: animate, critique
- rule: Something is visible by the reference's first content time + 0.1 s; no long empty opening.
- why: v0 opened on an empty frame.
- check: measure.py render_first_content <= reference_first_content + 0.1.
- source: Naxified v0 review, 2026-11-05

## R-ED-005 No cut through black unless the reference has one
- status: active
- applies: plan, animate, critique
- rule: Transitions are built (beam swing, blackout with a lamp still lit, white flood) as the reference does them; a hard cut through black happens only where beat-map.json has one.
- why: v0 cut through black six times.
- check: measure.py lists no black or empty span that is missing from beat-plan.json.
- source: Naxified v0 review, 2026-11-05

## R-ED-006 The logo is sacred
- status: active
- applies: storyboard, animate, variants, storyboard-check, critique, final-qa
- rule: The approved logo file is used as is: 0 degrees, exact aspect, no band, shape or effect behind or on it; light may pass over it.
- why: v0 put the logo on a band tilted 1.5 degrees.
- check: Logo frame shows 0 degree rotation and aspect within 1% of the file.
- source: Naxified v0 review, 2026-11-05

## R-ED-007 Brand tokens and fonts only
- status: active
- applies: storyboard, animate, critique, final-qa
- rule: Colours come from brand-facts.md tokens and type uses the brand font files; never sample brand colours from a logo PNG.
- why: v0 sampled colours from a PNG and used the wrong font.
- check: No hex outside the brand tokens and the reference's allowed stage colours in build/; fonts match brand-facts.md.
- source: Naxified v0 review, 2026-11-05

## R-ED-008 During holds, titles still and light moving
- status: active
- applies: animate, critique
- rule: Once a title lands it does not move; the light keeps moving (3-5 degree swing or 2-4% drift) so no hold reads as a frozen frame.
- why: v0 froze for 1.3-1.7 s five times.
- check: measure.py long_freezes is empty.
- source: Naxified v0 review, 2026-11-05

## R-ED-009 Master in the reference's aspect
- status: active
- applies: plan, animate
- rule: The master render uses the reference's aspect unless the brief names another; other aspects are recomposed variants, never crops.
- why: v0 made a 4:5 master from a 16:9 reference and lost the composition.
- check: measure.py spec.aspect_matches is true for the master, or the brief names the aspect.
- source: Naxified v0 review, 2026-11-05

## R-ED-010 No layout-allow escape hatches on scene roots
- status: active
- applies: storyboard, animate, critique
- rule: Fix layout errors; data-layout-allow-* goes only on a single intentional element, never on a scene root.
- why: v0 silenced the layout checker on whole scenes and shipped a cut-off title.
- check: measure.py code_smells has no data-layout-allow on a scene root.
- source: Naxified v0 review, 2026-11-05
