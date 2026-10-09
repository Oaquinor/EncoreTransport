<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addRouteColumns();
        $this->addTripColumns();
        $this->addPassengerColumns();
        $this->addPaymentColumns();
        $this->addTicketColumns();

        // incidents may already have been created by 2026_10_08_000200_add_operational_flow.
        // Keep that schema (title/severity), because the current model/controller use it.
        if (!Schema::hasTable('incidents')) {
            Schema::create('incidents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
                $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
                $table->foreignId('reported_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('title', 120);
                $table->text('description');
                $table->string('severity', 16)->default('medium');
                $table->string('status', 24)->default('open');
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();
                $table->index(['trip_id', 'status']);
                $table->index(['status', 'severity']);
            });
        }
    }

    private function addRouteColumns(): void
    {
        $columns = [
            'origin_latitude' => fn (Blueprint $t) => $t->decimal('origin_latitude', 10, 7)->nullable()->after('destination'),
            'origin_longitude' => fn (Blueprint $t) => $t->decimal('origin_longitude', 10, 7)->nullable()->after('origin_latitude'),
            'destination_latitude' => fn (Blueprint $t) => $t->decimal('destination_latitude', 10, 7)->nullable()->after('origin_longitude'),
            'destination_longitude' => fn (Blueprint $t) => $t->decimal('destination_longitude', 10, 7)->nullable()->after('destination_latitude'),
            'distance_meters' => fn (Blueprint $t) => $t->unsignedBigInteger('distance_meters')->nullable()->after('distance_km'),
            'duration_seconds' => fn (Blueprint $t) => $t->unsignedInteger('duration_seconds')->nullable()->after('distance_meters'),
            'route_geometry' => fn (Blueprint $t) => $t->json('route_geometry')->nullable()->after('duration_seconds'),
        ];

        foreach ($columns as $name => $definition) {
            if (!Schema::hasColumn('transport_routes', $name)) {
                Schema::table('transport_routes', $definition);
            }
        }
    }

    private function addTripColumns(): void
    {
        $addedStatusIndexSource = false;
        if (!Schema::hasColumn('trips', 'started_at')) {
            Schema::table('trips', fn (Blueprint $t) => $t->timestamp('started_at')->nullable()->after('status'));
            $addedStatusIndexSource = true;
        }
        if (!Schema::hasColumn('trips', 'completed_at')) {
            Schema::table('trips', fn (Blueprint $t) => $t->timestamp('completed_at')->nullable()->after('started_at'));
        }
        if (!Schema::hasColumn('trips', 'cancelled_at')) {
            Schema::table('trips', fn (Blueprint $t) => $t->timestamp('cancelled_at')->nullable()->after('completed_at'));
        }

        if ($addedStatusIndexSource) {
            Schema::table('trips', fn (Blueprint $t) => $t->index(['status', 'departure_date']));
        }
    }

    private function addPassengerColumns(): void
    {
        $addedStatus = false;
        if (!Schema::hasColumn('booking_passengers', 'status')) {
            Schema::table('booking_passengers', function (Blueprint $table) {
                $table->string('status', 24)->default('booked')->after('phone');
            });
            $addedStatus = true;
        }

        if (!Schema::hasColumn('booking_passengers', 'boarded_at')) {
            Schema::table('booking_passengers', function (Blueprint $table) {
                $table->timestamp('boarded_at')->nullable()->after('status');
            });
        }

        if ($addedStatus) {
            Schema::table('booking_passengers', fn (Blueprint $table) => $table->index(['booking_id', 'status']));
        }
    }

    private function addPaymentColumns(): void
    {
        if (!Schema::hasColumn('payments', 'idempotency_key')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->string('idempotency_key', 80)->nullable()->unique()->after('booking_id');
            });
        }

        if (!Schema::hasColumn('payment_transactions', 'external_event_id')) {
            Schema::table('payment_transactions', function (Blueprint $table) {
                $table->string('external_event_id', 128)->nullable()->unique()->after('event');
            });
        }
    }

    private function addTicketColumns(): void
    {
        if (!Schema::hasColumn('tickets', 'validation_token_hash')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->char('validation_token_hash', 64)->nullable()->unique()->after('qr_payload');
            });
        }

        if (!Schema::hasColumn('tickets', 'validated_at')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->timestamp('validated_at')->nullable()->after('used_at');
            });
        }
    }

    public function down(): void
    {
        // Intentionally conservative: this migration reconciles installations that may have
        // been partially migrated. Automatic rollback could remove columns created by the
        // earlier operational migration, so destructive rollback is avoided.
    }
};
