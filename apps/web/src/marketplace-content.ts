export const serviceTaxonomy=[
 ['diagnostics','Diagnostics','Find the real issue before parts get replaced.'],
 ['maintenance','Maintenance','Keep performance, safety, and value on schedule.'],
 ['brakes','Brakes','Inspection and repair for confident stopping.'],
 ['electrical','Electrical','Modern diagnostics for complex vehicle systems.'],
 ['inspection','Inspections','A clearer view before you buy or travel.'],
 ['tires','Tires & alignment','Protect handling, comfort, and tire life.'],
] as const;
export const vehicleMakes=['BMW','Mercedes-Benz','Audi','Volkswagen','Volvo','Porsche','MINI','Land Rover','Jaguar'] as const;
export const makeSlug=(name:string)=>name.toLowerCase().replaceAll(' ','-');
