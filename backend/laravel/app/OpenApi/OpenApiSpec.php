<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'EncoreTransport API',
    description: 'API REST v1 de EncoreTransport. Laravel es la fuente de verdad para autenticacion, rutas, viajes, asientos, reservas y tracking.',
    contact: new OA\Contact(name: 'EncoreTransport')
)]
#[OA\Server(
    url: 'http://127.0.0.1:8000',
    description: 'Servidor local'
)]
#[OA\SecurityScheme(
    securityScheme: 'bearerAuth',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Token'
)]
#[OA\Tag(name: 'Health', description: 'Estado de la API')]
#[OA\Tag(name: 'Authentication', description: 'Autenticacion y sesion API')]
#[OA\Tag(name: 'Routes', description: 'Rutas de transporte')]
#[OA\Tag(name: 'Trips', description: 'Viajes y busqueda')]
#[OA\Tag(name: 'Seats', description: 'Disponibilidad de asientos')]
#[OA\Tag(name: 'Bookings', description: 'Reservas')]
#[OA\Tag(name: 'Drivers', description: 'Operaciones del conductor')]
#[OA\Tag(name: 'Tracking', description: 'Ubicacion del vehiculo')]
#[OA\Tag(name: 'Admin', description: 'Dashboard administrativo')]
#[OA\Schema(
    schema: 'ApiError',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', example: 'Validation failed.'),
        new OA\Property(property: 'errors', type: 'object', nullable: true),
    ]
)]
#[OA\Schema(
    schema: 'User',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Passenger Demo'),
        new OA\Property(property: 'email', type: 'string', format: 'email', example: 'passenger@example.test'),
        new OA\Property(property: 'role', type: 'string', enum: ['passenger', 'driver', 'admin'], example: 'passenger'),
        new OA\Property(property: 'phone', type: 'string', nullable: true, example: '+18095550000'),
        new OA\Property(property: 'active', type: 'boolean', example: true),
    ]
)]
#[OA\Schema(
    schema: 'TransportRoute',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'origin', type: 'string', example: 'Boston'),
        new OA\Property(property: 'destination', type: 'string', example: 'New York'),
        new OA\Property(property: 'distance_km', type: 'integer', example: 346),
        new OA\Property(property: 'active', type: 'boolean', example: true),
    ]
)]
#[OA\Schema(
    schema: 'Trip',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'routeName', type: 'string', example: 'Boston -> New York'),
        new OA\Property(property: 'origin', type: 'string', example: 'Boston'),
        new OA\Property(property: 'destination', type: 'string', example: 'New York'),
        new OA\Property(property: 'date', type: 'string', format: 'date'),
        new OA\Property(property: 'departureTime', type: 'string', example: '07:00:00'),
        new OA\Property(property: 'arrivalTime', type: 'string', example: '10:15:00'),
        new OA\Property(property: 'baseFare', type: 'integer', example: 85),
        new OA\Property(property: 'status', type: 'string', example: 'scheduled'),
        new OA\Property(property: 'availableSeats', type: 'integer', example: 40),
    ]
)]
#[OA\Schema(
    schema: 'Seat',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'seat_number', type: 'string', example: '1A'),
        new OA\Property(property: 'seat_class', type: 'string', example: 'standard'),
        new OA\Property(property: 'window', type: 'boolean', example: true),
        new OA\Property(property: 'aisle', type: 'boolean', example: false),
        new OA\Property(property: 'available', type: 'boolean', example: true),
    ]
)]
#[OA\Schema(
    schema: 'BookingPassengerInput',
    type: 'object',
    required: ['full_name'],
    properties: [
        new OA\Property(property: 'full_name', type: 'string', example: 'Maria Torres'),
        new OA\Property(property: 'document_number', type: 'string', nullable: true, example: '001-0000000-0'),
        new OA\Property(property: 'email', type: 'string', format: 'email', nullable: true, example: 'maria@example.com'),
        new OA\Property(property: 'phone', type: 'string', nullable: true, example: '+18095550000'),
    ]
)]
#[OA\Schema(
    schema: 'Booking',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'public_id', type: 'string', format: 'uuid'),
        new OA\Property(property: 'reference', type: 'string', example: 'ET-ABC1234567'),
        new OA\Property(property: 'trip_id', type: 'integer', example: 1),
        new OA\Property(property: 'status', type: 'string', example: 'pending_payment'),
        new OA\Property(property: 'seat_numbers', type: 'array', items: new OA\Items(type: 'string'), example: ['1A', '1B']),
        new OA\Property(property: 'total_amount', type: 'integer', example: 170),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time', nullable: true),
    ]
)]
#[OA\Schema(
    schema: 'DriverLocation',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'driver_id', type: 'integer', example: 1),
        new OA\Property(property: 'trip_id', type: 'integer', example: 1),
        new OA\Property(property: 'latitude', type: 'number', format: 'double', example: 18.4861),
        new OA\Property(property: 'longitude', type: 'number', format: 'double', example: -69.9312),
        new OA\Property(property: 'heading', type: 'number', format: 'double', nullable: true, example: 90),
        new OA\Property(property: 'speed_kph', type: 'number', format: 'double', nullable: true, example: 55),
        new OA\Property(property: 'recorded_at', type: 'string', format: 'date-time'),
    ]
)]
class OpenApiSpec
{
}
