<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transport_routes', function (Blueprint $table) {
            $table->decimal('origin_latitude', 10, 7)->nullable()->after('destination');
            $table->decimal('origin_longitude', 10, 7)->nullable()->after('origin_latitude');
            $table->decimal('destination_latitude', 10, 7)->nullable()->after('origin_longitude');
            $table->decimal('destination_longitude', 10, 7)->nullable()->after('destination_latitude');
            $table->unsignedBigInteger('distance_meters')->nullable()->after('distance_km');
            $table->unsignedInteger('duration_seconds')->nullable()->after('distance_meters');
            $table->json('route_geometry')->nullable()->after('duration_seconds');
        });

        Schema::table('trips', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->after('status');
            $table->timestamp('completed_at')->nullable()->after('started_at');
            $table->timestamp('cancelled_at')->nullable()->after('completed_at');
            $table->index(['status', 'departure_date']);
        });

        Schema::table('booking_passengers', function (Blueprint $table) {
            $table->string('status', 24)->default('booked')->after('phone');
            $table->timestamp('boarded_at')->nullable()->after('status');
            $table->index(['booking_id', 'status']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('idempotency_key', 80)->nullable()->unique()->after('booking_id');
        });

        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->string('external_event_id', 128)->nullable()->unique()->after('event');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->char('validation_token_hash', 64)->nullable()->unique()->after('qr_payload');
            $table->timestamp('validated_at')->nullable()->after('used_at');
        });

        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->foreignId('reported_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 64);
            $table->string('priority', 24)->default('medium');
            $table->text('description');
            $table->string('status', 24)->default('open');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['trip_id', 'status']);
            $table->index(['priority', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents');

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropUnique(['validation_token_hash']);
            $table->dropColumn(['validation_token_hash', 'validated_at']);
        });

        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->dropUnique(['external_event_id']);
            $table->dropColumn('external_event_id');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['idempotency_key']);
            $table->dropColumn('idempotency_key');
        });

        Schema::table('booking_passengers', function (Blueprint $table) {
            $table->dropIndex(['booking_id', 'status']);
            $table->dropColumn(['status', 'boarded_at']);
        });

        Schema::table('trips', function (Blueprint $table) {
            $table->dropIndex(['status', 'departure_date']);
            $table->dropColumn(['started_at', 'completed_at', 'cancelled_at']);
        });

        Schema::table('transport_routes', function (Blueprint $table) {
            $table->dropColumn([
                'origin_latitude', 'origin_longitude', 'destination_latitude', 'destination_longitude',
                'distance_meters', 'duration_seconds', 'route_geometry',
            ]);
        });
    }
};
