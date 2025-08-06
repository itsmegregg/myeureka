<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $this->call([
            \Database\Seeders\StoreSeeder::class,
            \Database\Seeders\BranchSeeder::class,
            \Database\Seeders\UserSeeder::class, // Uncomment if you have a UserSeeder and want to run it
        ]);
    }
}
