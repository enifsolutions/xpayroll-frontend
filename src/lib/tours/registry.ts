// Registered admin tour keys. Add one entry here whenever a new page ships
// a tour, so it appears in the profile page's replay list automatically.
export interface RegisteredTour {
  tourKey: string
  label: string
}

export const REGISTERED_TOURS: RegisteredTour[] = [
  { tourKey: 'admin-global-welcome', label: 'Welcome tour' },
  { tourKey: 'admin-page-employees', label: 'Employees page' },
]
