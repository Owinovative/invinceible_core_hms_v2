# Clinical Decision Support

Clinical decision support is a warning system. It does not diagnose, prescribe, or replace clinicians.

## Implemented endpoint

`POST /clinical-safety/evaluate`

It checks:

- low or critical oxygen saturation
- critical or abnormal blood pressure
- abnormal temperature
- abnormal pulse
- high pain score
- pregnancy medication review reminder
- allergy medication review reminder
- abnormal or critical lab flags
- duplicate medicine entries

## Safety rules

- Warnings are advisory.
- Critical warnings require clinician review.
- Overrides should be audited when wired into the consultation UI.
- External AI is not used for clinical decision support.
