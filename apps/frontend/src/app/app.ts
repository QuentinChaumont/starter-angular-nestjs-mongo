import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConsentBanner } from '@org/frontend-consent';

@Component({
  imports: [RouterModule, ConsentBanner],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'frontend';
}
