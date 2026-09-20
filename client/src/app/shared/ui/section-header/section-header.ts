import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-section-header',
  templateUrl: './section-header.html',
  styleUrl: './section-header.scss',
})
export class SectionHeader {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
}
