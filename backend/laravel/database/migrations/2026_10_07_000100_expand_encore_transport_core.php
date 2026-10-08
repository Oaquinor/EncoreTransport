<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 32)->default('passenger')->after('email');
            $table->string('phone', 40)->nullable()->after('role');
            $table->boolean('active')->default(true)->after('phone');
            $table->index(['role', 'active']);
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->index('user_id');
        });

        Schema::create('route_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transport_route_id')->constrained('transport_routes')->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence');
            $table->string('name');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedSmallInteger('offset_minutes')->default(0);
            $table->timestamps();
            $table->unique(['transport_route_id', 'sequence']);
        });

        Schema::create('bus_seats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bus_id')->constrained('buses')->cascadeOnDelete();
            $table->string('seat_number', 16);
            $table->string('seat_class', 32)->default('standard');
            $table->boolean('window')->default(false);
            $table->boolean('aisle')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['bus_id', 'seat_number']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->uuid('public_id')->nullable()->unique()->after('id');
            $table->foreignId('user_id')->nullable()->after('trip_id')->constrained('users')->nullOnDelete();
            $table->string('reference', 32)->nullable()->unique()->after('user_id');
            $table->timestamp('expires_at')->nullable()->after('status');
            $table->timestamp('confirmed_at')->nullable()->after('expires_at');
        });

        Schema::create('booking_passengers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->string('full_name');
            $table->string('document_number', 64)->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            $table->timestamps();
        });

        Schema::create('booking_seats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignId('bus_seat_id')->constrained('bus_seats')->cascadeOnDelete();
            $table->string('status', 24)->default('held');
            $table->timestamp('held_until')->nullable();
            $table->timestamps();
            $table->unique(['trip_id', 'bus_seat_id']);
            $table->index(['trip_id', 'status']);
        });

        Schema::create('api_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name')->default('api');
            $table->char('token_hash', 64)->unique();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'expires_at']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->string('gateway', 40);
            $table->string('status', 32)->default('pending');
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('DOP');
            $table->string('gateway_reference')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->string('event', 80);
            $table->string('gateway_reference')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
            $table->index(['payment_id', 'event']);
        });

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->string('status', 24)->default('active');
            $table->text('qr_payload');
            $table->timestamp('issued_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
            $table->unique('booking_id');
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->cascadeOnDelete();
            $table->string('channel', 24);
            $table->string('type', 64);
            $table->string('status', 24)->default('pending');
            $table->json('payload')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'channel']);
        });

        Schema::create('driver_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->foreignId('trip_id')->nullable()->constrained('trips')->cascadeOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('heading', 6, 2)->nullable();
            $table->decimal('speed_kph', 7, 2)->nullable();
            $table->timestamp('recorded_at');
            $table->timestamps();
            $table->index(['trip_id', 'recorded_at']);
            $table->index(['driver_id', 'recorded_at']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 80);
            $table->string('subject_type')->nullable();
            $table->string('subject_id')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('driver_locations');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('api_tokens');
        Schema::dropIfExists('booking_seats');
        Schema::dropIfExists('booking_passengers');
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['public_id', 'reference', 'expires_at', 'confirmed_at']);
        });
        Schema::dropIfExists('bus_seats');
        Schema::dropIfExists('route_stops');
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'phone', 'active']);
        });
    }
};
