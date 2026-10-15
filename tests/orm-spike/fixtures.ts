export const organizationA = '10000000-0000-4000-8000-000000000001';
export const organizationB = '10000000-0000-4000-8000-000000000002';
export const scopes = [
  { organizationId: organizationA, eventId: '20000000-0000-4000-8000-000000000001' },
  { organizationId: organizationA, eventId: '20000000-0000-4000-8000-000000000002' },
  { organizationId: organizationB, eventId: '20000000-0000-4000-8000-000000000003' },
];
export const records = scopes.map((scope, index) => ({
  ...scope, id: `30000000-0000-4000-8000-00000000000${index + 1}`, title: `Fixture ${index + 1}`,
}));
