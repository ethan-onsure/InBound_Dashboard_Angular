import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { GoogleChart } from 'angular-google-charts';
import { PortalBase } from './portal-base';

@Component({
  selector: 'app-portal-v2',
  imports: [CommonModule, FormsModule, GoogleChart, MatDatepickerModule, MatFormFieldModule, MatNativeDateModule],
  templateUrl: './portal-v2.component.html',
  styleUrl: './portal-v2.component.scss',
})
export class PortalV2Component extends PortalBase {
  readonly clockLabel = computed(() => new Intl.DateTimeFormat('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(this.now()));
}
