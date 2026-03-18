import { describe, it, expect } from 'vitest';
import { haversineKm } from './maptoolkit.js';

describe('haversineKm', () => {
  it('calculates the distance between two points correctly (New York to London)', () => {
    // New York: 40.7128° N, 74.0060° W
    const ny = { lat: 40.7128, lng: -74.0060 };
    // London: 51.5074° N, 0.1278° W
    const london = { lat: 51.5074, lng: -0.1278 };

    // Distance is approximately 5570 km
    const distance = haversineKm(ny, london);
    expect(distance).toBeGreaterThan(5500);
    expect(distance).toBeLessThan(5650);
  });

  it('calculates the distance between two points correctly (Tokyo to Sydney)', () => {
    // Tokyo: 35.6764° N, 139.6500° E
    const tokyo = { lat: 35.6764, lng: 139.6500 };
    // Sydney: 33.8688° S, 151.2093° E
    const sydney = { lat: -33.8688, lng: 151.2093 };

    // Distance is approximately 7820 km
    const distance = haversineKm(tokyo, sydney);
    expect(distance).toBeGreaterThan(7800);
    expect(distance).toBeLessThan(7850);
  });

  it('returns 0 for the same point', () => {
    const point = { lat: 45.0, lng: -90.0 };
    expect(haversineKm(point, point)).toBe(0);
  });

  it('calculates the distance correctly across the equator', () => {
    // Point North of equator: 10° N, 0° E
    const p1 = { lat: 10, lng: 0 };
    // Point South of equator: 10° S, 0° E
    const p2 = { lat: -10, lng: 0 };

    // 20 degrees of latitude is roughly 2224 km (1 degree ~ 111.2 km)
    const distance = haversineKm(p1, p2);
    expect(distance).toBeGreaterThan(2210);
    expect(distance).toBeLessThan(2230);
  });

  it('calculates the distance correctly across the antimeridian (180th meridian)', () => {
    // Point West of antimeridian: 0° N, 179° E
    const p1 = { lat: 0, lng: 179 };
    // Point East of antimeridian: 0° N, 179° W (-179° E)
    const p2 = { lat: 0, lng: -179 };

    // 2 degrees of longitude at equator is roughly 222 km
    const distance = haversineKm(p1, p2);
    expect(distance).toBeGreaterThan(220);
    expect(distance).toBeLessThan(225);
  });

  it('calculates distance between exact poles correctly', () => {
    const northPole = { lat: 90, lng: 0 };
    const southPole = { lat: -90, lng: 0 };

    // Half the Earth's circumference (Pi * R)
    // 3.14159 * 6371 ~= 20015 km
    const distance = haversineKm(northPole, southPole);
    expect(distance).toBeGreaterThan(20000);
    expect(distance).toBeLessThan(20030);
  });
});
