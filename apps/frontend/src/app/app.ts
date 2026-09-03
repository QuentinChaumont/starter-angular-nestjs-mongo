import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConsentBanner, LegalLinks } from '@org/frontend-consent';
import { VerifyEmailBanner } from '@org/frontend-auth';

@Component({
  imports: [RouterModule, ConsentBanner, LegalLinks, VerifyEmailBanner],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'frontend';
}
