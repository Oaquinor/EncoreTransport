<?php

namespace Database\Seeders;

use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Database\Seeder;

/** Backwards-compatible wrapper. Demo data lives under database/seeders/Demo. */
class EncoreTransportSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(EncoreTransportDemoSeeder::class);
    }
}
