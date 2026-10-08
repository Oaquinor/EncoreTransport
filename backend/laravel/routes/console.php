<?php

use App\Jobs\ReleaseExpiredBookings;
use Illuminate\Support\Facades\Schedule;

Schedule::job(new ReleaseExpiredBookings)->everyMinute()->withoutOverlapping();
