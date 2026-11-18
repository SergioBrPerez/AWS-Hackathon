"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

export type PuntoMapa = {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  precio: string;
  /** undefined = candidato no auditado */
  encaje?: number;
  distanciaKm?: number;
};

const colorEncaje = (e: number) => (e >= 100 ? "var(--verde)" : e >= 50 ? "var(--amarillo)" : "var(--rojo)");

function icono(p: PuntoMapa) {
  const auditado = p.encaje !== undefined;
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: auditado
      ? `<span class="pin" style="background:${colorEncaje(p.encaje!)}">${p.encaje}% · ${p.precio}</span>`
      : `<span class="pin pin-gris">${p.precio}</span>`,
  });
}

const iconoYo = L.divIcon({ className: "", iconSize: [0, 0], html: `<span class="pin pin-yo" title="Tú"></span>` });

function Encuadre({ puntos, yo }: { puntos: PuntoMapa[]; yo?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = puntos.map((p) => [p.latitud, p.longitud]);
    if (yo) coords.push(yo);
    if (coords.length) map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 15 });
  }, [map, puntos, yo]);
  return null;
}

export default function Mapa({ puntos, yo, onSeleccionar }: { puntos: PuntoMapa[]; yo?: [number, number]; onSeleccionar?: (id: string) => void }) {
  return (
    <div className="h-[60vh] min-h-80 overflow-hidden rounded-2xl border border-line">
      <MapContainer center={[40.4168, -3.7038]} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Primero los grises, para que los auditados queden encima */}
        {[...puntos].sort((a, b) => Number(a.encaje !== undefined) - Number(b.encaje !== undefined)).map((p) => (
          <Marker key={p.id} position={[p.latitud, p.longitud]} icon={icono(p)} eventHandlers={{ click: () => onSeleccionar?.(p.id) }}>
            <Popup>
              <strong>{p.nombre}</strong>
              <br />
              {p.encaje !== undefined ? `Encaje ${p.encaje}% · ${p.precio}` : `${p.precio} · sin auditar`}
              {p.distanciaKm !== undefined && ` · a ${p.distanciaKm.toFixed(1)} km`}
            </Popup>
          </Marker>
        ))}
        {yo && <Marker position={yo} icon={iconoYo} />}
        <Encuadre puntos={puntos} yo={yo} />
      </MapContainer>
    </div>
  );
}
