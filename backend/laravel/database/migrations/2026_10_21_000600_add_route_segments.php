<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('route_segments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transport_route_id')->constrained('transport_routes')->cascadeOnDelete();
            $table->unsignedSmallInteger('origin_stop_sequence');
            $table->unsignedSmallInteger('destination_stop_sequence');
            $table->string('origin_name', 150);
            $table->string('destination_name', 150);
            $table->unsignedInteger('price')->nullable();
            $table->unsignedInteger('distance_meters')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['transport_route_id', 'origin_stop_sequence', 'destination_stop_sequence'], 'route_segments_unique_pair');
            $table->index(['transport_route_id', 'active']);
        });

        Schema::table('booking_seats', function (Blueprint $table) {
            $table->unsignedSmallInteger('origin_stop_sequence')->default(1)->after('bus_seat_id');
            $table->unsignedSmallInteger('destination_stop_sequence')->default(2)->after('origin_stop_sequence');
        });

        Schema::table('booking_seats', function (Blueprint $table) {
            $table->dropUnique(['trip_id', 'bus_seat_id']);
            $table->unique(['trip_id', 'bus_seat_id', 'origin_stop_sequence', 'destination_stop_sequence'], 'booking_seats_segment_unique');
            $table->index(['trip_id', 'bus_seat_id', 'origin_stop_sequence', 'destination_stop_sequence'], 'booking_seats_overlap_lookup');
        });
    }

    public function down(): void
    {
        Schema::table('booking_seats', function (Blueprint $table) {
            $table->dropUnique('booking_seats_segment_unique');
            $table->dropIndex('booking_seats_overlap_lookup');
            $table->dropColumn(['origin_stop_sequence', 'destination_stop_sequence']);
            $table->unique(['trip_id', 'bus_seat_id']);
        });
        Schema::dropIfExists('route_segments');
    }
};
