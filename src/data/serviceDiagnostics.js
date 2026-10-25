const fallbackQuestions = [
  { key: 'current_condition', label: 'What happens when you try to use it now?' },
  { key: 'when_started', label: 'When did the issue start?' },
  { key: 'previous_work', label: 'Has anyone worked on this issue before?' },
]

const questionSets = {
  electrician: [
    { key: 'affected_area', label: 'What is affected: a socket, light, breaker, room, or the whole property?' },
    { key: 'power_elsewhere', label: 'Is there power elsewhere in the property?' },
    { key: 'safety_signs', label: 'Any sparks, heat, burning smell, or exposed wire?' },
  ],
  plumber: [
    { key: 'problem_type', label: 'Is it a leak, blockage, low pressure, broken fitting, or installation?' },
    { key: 'water_flow', label: 'Is water still flowing or leaking now?' },
    { key: 'location', label: 'Is it in a kitchen, bathroom, outdoor area, or commercial space?' },
  ],
  'ac-repair': [
    { key: 'unit_type', label: 'What type of AC is it: split, window, standing, or central?' },
    { key: 'symptom', label: 'Is it not cooling, not powering, leaking, noisy, or smelling unusual?' },
    { key: 'last_service', label: 'When was it last serviced, if known?' },
  ],
  'generator-repair': [
    { key: 'fuel_type', label: 'Is it petrol or diesel?' },
    { key: 'starts', label: 'Does it start?' },
    { key: 'symptom', label: 'Is there no power output, smoke, noise, leaking, or overheating?' },
  ],
  'appliance-repair': [
    { key: 'item', label: 'What appliance or device needs repair?' },
    { key: 'brand_model', label: 'What is the brand and model, if known?' },
    { key: 'symptom', label: 'What happens when it is switched on? Include any error code, sound, smell, or leak.' },
  ],
  cleaner: [
    { key: 'property_type', label: 'Is this a home, office, shop, shortlet, or post-construction space?' },
    { key: 'size', label: 'How many rooms and bathrooms, or approximately how large is the space?' },
    { key: 'clean_type', label: 'Do you need regular, deep, move-in/out, or post-construction cleaning?' },
  ],
  'barber-hair-stylist': [
    { key: 'service_style', label: 'What haircut, grooming, braiding, treatment, or style do you want?' },
    { key: 'people', label: 'How many people need the service?' },
    { key: 'visit_type', label: 'Do you want a home visit or will you visit the professional?' },
  ],
}

export function getDiagnosticQuestions(service) {
  const slug = service?.slug || service?.name?.toLowerCase().replaceAll(' ', '-')
  return questionSets[slug] || fallbackQuestions
}
