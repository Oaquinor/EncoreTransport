<?php

namespace Database\Seeders;

use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment(['local','testing'])) {
            $this->call(EncoreTransportDemoSeeder::class);
        }
    }
}
