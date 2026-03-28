import { Platform } from 'react-native';
import type { Trajet, TrajetStatut } from '../types/trajet';
import type { Horodatage, HorodatageFormData } from '../types/horodatage';
import type { Vehicule, VehiculeFormData } from '../types/vehicule';
import type { FavoritePlaceKind, PlaceResult, SavedPlace } from '../types/places';

let db: any = null;

async function getSQLite() {
  return await import('expo-sqlite');
}

export async function getDatabase(): Promise<any> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web');
  }
  if (!db) {
    const SQLite = await getSQLite();
    db = await SQLite.openDatabaseAsync('kilotrack.db');
    await initializeSchema(db);
  }
  return db;
}

async function initializeSchema(database: any): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS vehicules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      immatriculation TEXT NOT NULL DEFAULT '',
      tarif_km REAL NOT NULL,
      puissance_fiscale INTEGER NOT NULL DEFAULT 0,
      is_electrique INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS trajets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      adresse_depart TEXT NOT NULL,
      adresse_arrivee TEXT NOT NULL,
      distance_km REAL NOT NULL,
      aller_retour INTEGER NOT NULL DEFAULT 0,
      motif TEXT NOT NULL DEFAULT '',
      vehicule_id INTEGER NOT NULL,
      montant_eur REAL NOT NULL,
      statut TEXT NOT NULL DEFAULT 'brouillon',
      FOREIGN KEY (vehicule_id) REFERENCES vehicules(id)
    );

    CREATE TABLE IF NOT EXISTS horodatages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      heure TEXT NOT NULL,
      kilometrage_km REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      vehicule_id INTEGER NOT NULL,
      FOREIGN KEY (vehicule_id) REFERENCES vehicules(id)
    );

    CREATE TABLE IF NOT EXISTS recent_places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      display_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      icon TEXT NOT NULL DEFAULT 'location-outline',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorite_places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_key TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'custom',
      label TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      display_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      icon TEXT NOT NULL DEFAULT 'star',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trajets_date ON trajets(date);
    CREATE INDEX IF NOT EXISTS idx_trajets_vehicule ON trajets(vehicule_id);
    CREATE INDEX IF NOT EXISTS idx_trajets_statut ON trajets(statut);
    CREATE INDEX IF NOT EXISTS idx_horodatages_date ON horodatages(date);
    CREATE INDEX IF NOT EXISTS idx_horodatages_vehicule ON horodatages(vehicule_id);
    CREATE INDEX IF NOT EXISTS idx_recent_places_updated_at ON recent_places(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_favorite_places_kind ON favorite_places(kind, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_favorite_places_key ON favorite_places(place_key);
  `);

  await ensureColumn(
    database,
    'vehicules',
    'puissance_fiscale',
    'INTEGER NOT NULL DEFAULT 0'
  );
  await ensureColumn(
    database,
    'vehicules',
    'is_electrique',
    'INTEGER NOT NULL DEFAULT 0'
  );
}

async function ensureColumn(
  database: any,
  tableName: string,
  columnName: string,
  definition: string
): Promise<void> {
  const columns = await database.getAllAsync(
    `PRAGMA table_info(${tableName})`
  ) as { name: string }[];

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await database.execAsync(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
  );
}

function buildPlaceKey(place: PlaceResult): string {
  const baseTitle = (place.title || place.display_name || '').trim().toLowerCase();
  const lat = Number.parseFloat(place.lat).toFixed(5);
  const lon = Number.parseFloat(place.lon).toFixed(5);
  return `${baseTitle}::${lat}::${lon}`;
}

function rowToSavedPlace(row: any): SavedPlace {
  return {
    id: row.id,
    label: row.label ?? '',
    favorite_kind: (row.kind ?? 'custom') as FavoritePlaceKind,
    title: row.title,
    subtitle: row.subtitle,
    display_name: row.display_name,
    lat: String(row.latitude),
    lon: String(row.longitude),
    icon: row.icon,
    source: 'apple',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getFavoriteLabel(kind: FavoritePlaceKind, label?: string): string {
  if (label?.trim()) return label.trim();
  if (kind === 'home') return 'Maison';
  if (kind === 'work') return 'Travail';
  return 'Favori';
}

function getFavoriteIcon(kind: FavoritePlaceKind): string {
  if (kind === 'home') return 'home';
  if (kind === 'work') return 'briefcase';
  return 'star';
}

function rowToVehicule(row: any): Vehicule {
  return {
    id: row.id,
    nom: row.nom,
    immatriculation: row.immatriculation ?? '',
    puissance_fiscale: row.puissance_fiscale ?? 0,
    is_electrique: row.is_electrique === 1,
  };
}

// ──── Vehicules ────

export async function insertVehicule(data: VehiculeFormData): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO vehicules
      (nom, immatriculation, tarif_km, puissance_fiscale, is_electrique)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.nom,
      data.immatriculation,
      0,
      data.puissance_fiscale,
      data.is_electrique ? 1 : 0,
    ]
  );
  return result.lastInsertRowId;
}

export async function getAllVehicules(): Promise<Vehicule[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    'SELECT * FROM vehicules ORDER BY nom'
  ) as any[];
  return rows.map(rowToVehicule);
}

export async function getVehiculeById(id: number): Promise<Vehicule | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT * FROM vehicules WHERE id = ?',
    [id]
  ) as any | null;
  return row ? rowToVehicule(row) : null;
}

export async function updateVehicule(
  id: number,
  data: VehiculeFormData
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE vehicules
     SET nom = ?, immatriculation = ?, tarif_km = ?, puissance_fiscale = ?, is_electrique = ?
     WHERE id = ?`,
    [
      data.nom,
      data.immatriculation,
      0,
      data.puissance_fiscale,
      data.is_electrique ? 1 : 0,
      id,
    ]
  );
}

export async function deleteVehicule(id: number): Promise<void> {
  const database = await getDatabase();
  const trajetCount = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM trajets WHERE vehicule_id = ?',
    [id]
  ) as { count: number } | null;
  const horodatageCount = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM horodatages WHERE vehicule_id = ?',
    [id]
  ) as { count: number } | null;
  const totalReferences = (trajetCount?.count ?? 0) + (horodatageCount?.count ?? 0);

  if (totalReferences > 0) {
    throw new Error(
      `Ce véhicule est utilisé par ${totalReferences} enregistrement(s). Supprimez-les d'abord.`
    );
  }
  await database.runAsync('DELETE FROM vehicules WHERE id = ?', [id]);
}

// ──── Trajets ────

export interface InsertTrajetData {
  date: string;
  adresse_depart: string;
  adresse_arrivee: string;
  distance_km: number;
  aller_retour: boolean;
  motif: string;
  vehicule_id: number;
  montant_eur: number;
}

export async function insertTrajet(data: InsertTrajetData): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO trajets (date, adresse_depart, adresse_arrivee, distance_km, aller_retour, motif, vehicule_id, montant_eur, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'brouillon')`,
    [
      data.date,
      data.adresse_depart,
      data.adresse_arrivee,
      data.distance_km,
      data.aller_retour ? 1 : 0,
      data.motif,
      data.vehicule_id,
      data.montant_eur,
    ]
  );
  return result.lastInsertRowId;
}

function rowToTrajet(row: any): Trajet {
  return {
    ...row,
    entry_type: 'trajet',
    aller_retour: row.aller_retour === 1,
  };
}

export async function getTrajetsByMonth(yearMonth: string): Promise<Trajet[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    "SELECT * FROM trajets WHERE date LIKE ? ORDER BY date DESC",
    [`${yearMonth}%`]
  ) as any[];
  return rows.map(rowToTrajet);
}

export async function getTrajetsByVehiculeAndYear(
  vehiculeId: number,
  year: string
): Promise<Trajet[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    `SELECT * FROM trajets
     WHERE vehicule_id = ? AND date LIKE ?
     ORDER BY date ASC, id ASC`,
    [vehiculeId, `${year}%`]
  ) as any[];
  return rows.map(rowToTrajet);
}

export async function getTrajetYearsForVehicule(
  vehiculeId: number
): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    `SELECT DISTINCT SUBSTR(date, 1, 4) as year
     FROM trajets
     WHERE vehicule_id = ?
     ORDER BY year ASC`,
    [vehiculeId]
  ) as { year: string }[];
  return rows.map((row) => row.year);
}

export async function getTrajetsByPeriod(
  dateDebut: string,
  dateFin: string,
  vehiculeId?: number | null,
  statut?: TrajetStatut | null
): Promise<Trajet[]> {
  const database = await getDatabase();
  let query = 'SELECT * FROM trajets WHERE date >= ? AND date <= ?';
  const params: any[] = [dateDebut, dateFin];

  if (vehiculeId) {
    query += ' AND vehicule_id = ?';
    params.push(vehiculeId);
  }
  if (statut) {
    query += ' AND statut = ?';
    params.push(statut);
  }
  query += ' ORDER BY date ASC';

  const rows = await database.getAllAsync(query, params) as any[];
  return rows.map(rowToTrajet);
}

export async function getTrajetById(id: number): Promise<Trajet | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT * FROM trajets WHERE id = ?',
    [id]
  ) as any | null;
  return row ? rowToTrajet(row) : null;
}

export async function updateTrajet(
  id: number,
  data: Partial<InsertTrajetData>
): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.adresse_depart !== undefined) { fields.push('adresse_depart = ?'); values.push(data.adresse_depart); }
  if (data.adresse_arrivee !== undefined) { fields.push('adresse_arrivee = ?'); values.push(data.adresse_arrivee); }
  if (data.distance_km !== undefined) { fields.push('distance_km = ?'); values.push(data.distance_km); }
  if (data.aller_retour !== undefined) { fields.push('aller_retour = ?'); values.push(data.aller_retour ? 1 : 0); }
  if (data.motif !== undefined) { fields.push('motif = ?'); values.push(data.motif); }
  if (data.vehicule_id !== undefined) { fields.push('vehicule_id = ?'); values.push(data.vehicule_id); }
  if (data.montant_eur !== undefined) { fields.push('montant_eur = ?'); values.push(data.montant_eur); }

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE trajets SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function updateTrajetStatut(
  id: number,
  statut: TrajetStatut
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE trajets SET statut = ? WHERE id = ?', [
    statut,
    id,
  ]);
}

export async function updateTrajetMontant(
  id: number,
  montant: number
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE trajets SET montant_eur = ? WHERE id = ?',
    [montant, id]
  );
}

export async function deleteTrajet(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM trajets WHERE id = ?', [id]);
}

// ──── Horodatages ────

export type InsertHorodatageData = HorodatageFormData;

function rowToHorodatage(row: any): Horodatage {
  return {
    ...row,
    entry_type: 'horodatage',
  };
}

export async function insertHorodatage(
  data: InsertHorodatageData
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO horodatages (date, heure, kilometrage_km, note, vehicule_id)
     VALUES (?, ?, ?, ?, ?)`,
    [data.date, data.heure, data.kilometrage_km, data.note, data.vehicule_id]
  );
  return result.lastInsertRowId;
}

export async function getHorodatagesByMonth(
  yearMonth: string
): Promise<Horodatage[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    'SELECT * FROM horodatages WHERE date LIKE ? ORDER BY date DESC, heure DESC, id DESC',
    [`${yearMonth}%`]
  ) as any[];
  return rows.map(rowToHorodatage);
}

export async function getHorodatagesByPeriod(
  dateDebut: string,
  dateFin: string,
  vehiculeId?: number | null
): Promise<Horodatage[]> {
  const database = await getDatabase();
  let query = 'SELECT * FROM horodatages WHERE date >= ? AND date <= ?';
  const params: any[] = [dateDebut, dateFin];

  if (vehiculeId) {
    query += ' AND vehicule_id = ?';
    params.push(vehiculeId);
  }

  query += ' ORDER BY date ASC, heure ASC, id ASC';
  const rows = await database.getAllAsync(query, params) as any[];
  return rows.map(rowToHorodatage);
}

export async function getHorodatageById(id: number): Promise<Horodatage | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT * FROM horodatages WHERE id = ?',
    [id]
  ) as any | null;
  return row ? rowToHorodatage(row) : null;
}

export async function updateHorodatage(
  id: number,
  data: Partial<InsertHorodatageData>
): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.heure !== undefined) { fields.push('heure = ?'); values.push(data.heure); }
  if (data.kilometrage_km !== undefined) { fields.push('kilometrage_km = ?'); values.push(data.kilometrage_km); }
  if (data.note !== undefined) { fields.push('note = ?'); values.push(data.note); }
  if (data.vehicule_id !== undefined) { fields.push('vehicule_id = ?'); values.push(data.vehicule_id); }

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE horodatages SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteHorodatage(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM horodatages WHERE id = ?', [id]);
}

// ──── Saved places ────

export async function getRecentPlaces(limit = 6): Promise<SavedPlace[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    'SELECT * FROM recent_places ORDER BY updated_at DESC LIMIT ?',
    [limit]
  ) as any[];
  return rows.map((row) => ({
    ...rowToSavedPlace(row),
    favorite_kind: 'custom',
  }));
}

export async function saveRecentPlace(place: PlaceResult, maxItems = 8): Promise<void> {
  const database = await getDatabase();
  const placeKey = buildPlaceKey(place);
  const now = new Date().toISOString();
  const title = (place.title || place.display_name).trim();
  const subtitle = place.subtitle?.trim() || '';

  await database.runAsync('DELETE FROM recent_places WHERE place_key = ?', [placeKey]);
  await database.runAsync(
    `INSERT INTO recent_places
      (place_key, title, subtitle, display_name, latitude, longitude, icon, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      placeKey,
      title,
      subtitle,
      place.display_name,
      Number.parseFloat(place.lat),
      Number.parseFloat(place.lon),
      place.icon || 'location-outline',
      now,
    ]
  );
  await database.runAsync(
    `DELETE FROM recent_places
     WHERE id NOT IN (
       SELECT id FROM recent_places ORDER BY updated_at DESC LIMIT ?
     )`,
    [maxItems]
  );
}

export async function clearRecentPlaces(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM recent_places');
}

export async function getFavoritePlaces(): Promise<SavedPlace[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    `SELECT * FROM favorite_places
     ORDER BY
       CASE kind
         WHEN 'home' THEN 0
         WHEN 'work' THEN 1
         ELSE 2
       END,
       created_at ASC`
  ) as any[];
  return rows.map(rowToSavedPlace);
}

export async function saveFavoritePlace(
  place: PlaceResult,
  kind: FavoritePlaceKind = 'custom',
  label?: string
): Promise<void> {
  const database = await getDatabase();
  const placeKey = buildPlaceKey(place);
  const title = (place.title || place.display_name).trim();
  const subtitle = place.subtitle?.trim() || '';
  const favoriteLabel = getFavoriteLabel(kind, label);
  const icon = getFavoriteIcon(kind);

  if (kind === 'home' || kind === 'work') {
    await database.runAsync('DELETE FROM favorite_places WHERE kind = ?', [kind]);
  } else {
    const existing = await database.getFirstAsync(
      'SELECT id FROM favorite_places WHERE kind = ? AND place_key = ?',
      [kind, placeKey]
    ) as { id: number } | null;
    if (existing) return;
  }

  await database.runAsync(
    `INSERT INTO favorite_places
      (place_key, kind, label, title, subtitle, display_name, latitude, longitude, icon, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      placeKey,
      kind,
      favoriteLabel,
      title,
      subtitle,
      place.display_name,
      Number.parseFloat(place.lat),
      Number.parseFloat(place.lon),
      icon,
      new Date().toISOString(),
    ]
  );
}

export async function removeFavoritePlace(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM favorite_places WHERE id = ?', [id]);
}

export interface MonthlySummary {
  total_km: number;
  total_eur: number;
  count: number;
}

export async function getMonthlySummary(
  yearMonth: string
): Promise<MonthlySummary> {
  const database = await getDatabase();
  const result = await database.getFirstAsync(
    "SELECT COALESCE(SUM(distance_km), 0) as total_km, COALESCE(SUM(montant_eur), 0) as total_eur, COUNT(*) as count FROM trajets WHERE date LIKE ?",
    [`${yearMonth}%`]
  ) as {
    total_km: number | null;
    total_eur: number | null;
    count: number;
  } | null;
  return {
    total_km: result?.total_km ?? 0,
    total_eur: result?.total_eur ?? 0,
    count: result?.count ?? 0,
  };
}

// ──── Total trip count (for paywall) ────

export async function getTotalTrajetCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM trajets'
  ) as { count: number } | null;
  return result?.count ?? 0;
}

// ──── Bulk status update for exports ────

export async function markTrajetsAsExported(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const database = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await database.runAsync(
    `UPDATE trajets SET statut = 'exporte' WHERE id IN (${placeholders})`,
    ids
  );
}
