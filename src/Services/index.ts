// Re-exportar todos los servicios desde un solo punto de entrada
export { staffService } from './staffService';
export { areaService } from './areaService';
export { templateService } from './templateService';
export { patternService, type SavedPattern } from './patternService';
export { availabilityService, type DayScheduleDB } from './availabilityService';
export { authService } from './authServices';
export { eventService, type CalendarEvent } from './eventServices';
export { resourceService } from './resourceServices';
export { scheduleService } from './scheduleServices';
