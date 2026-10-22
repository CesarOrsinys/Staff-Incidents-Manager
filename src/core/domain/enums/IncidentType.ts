export enum IncidentType {
  SUBSTITUTION = 'SUBSTITUTION',           // Sustitución (requiere horario y trabajador sustituido)
  VACATION = 'VACATION',                   // Vacaciones
  PERSONAL_MATTERS = 'PERSONAL_MATTERS',   // Asuntos Propios
  LEAVE_OR_DEATH = 'LEAVE_OR_DEATH',       // Baja / Fallecimiento
  CONTRACT_END = 'CONTRACT_END',           // Fin de Contrato
  OVERTIME = 'OVERTIME'                    // Horas Extra (requiere horario de inicio y fin)
}
