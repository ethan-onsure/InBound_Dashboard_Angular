import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortalBase } from './portal-base';

@Component({
  selector: 'app-portal-v2',
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-v2.component.html',
  styleUrl: './portal-v2.component.scss',
})
export class PortalV2Component extends PortalBase {
  readonly clockLabel = computed(() => new Intl.DateTimeFormat('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(this.now()));
}
