<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transport_route_id')->constrained('transport_routes');
            $table->foreignId('bus_id')->constrained('buses');
            $table->foreignId('driver_id')->constrained('drivers');
            $table->date('departure_date');
            $table->time('departure_time');
            $table->time('arrival_time');
            $table->string('status')->default('scheduled');
            $table->unsignedSmallInteger('available_seats');
            $table->unsignedInteger('price_per_passenger');
            $table->json('seat_map')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('trips'); }
};