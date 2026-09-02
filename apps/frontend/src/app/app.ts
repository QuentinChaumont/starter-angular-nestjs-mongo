import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConsentBanner } from '@org/frontend-consent';
import { VerifyEmailBanner } from '@org/frontend-auth';

@Component({
  imports: [RouterModule, ConsentBanner, VerifyEmailBanner],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'frontend';
}
